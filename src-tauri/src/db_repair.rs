//! Reparación de checksums de migraciones antes de abrir la base.
//!
//! sqlx guarda en `_sqlx_migrations` el SHA-384 del SQL de cada migración y
//! se niega a abrir la base si el SQL embebido no coincide byte a byte
//! ("migration N was previously applied but has been modified").
//!
//! El SQL entra al binario con `include_str!`, así que sus bytes dependen de
//! cómo Git dejó los archivos en la máquina que compiló: el runner Windows de
//! GitHub hace checkout con CRLF y una PC con `autocrlf=false` (o macOS) con
//! LF. Mismo contenido, distinto checksum → el panel no arrancaba y el login
//! mostraba "No se pudo iniciar sesión." con cualquier cuenta.
//!
//! Solución:
//!  1. `normalize_migrations` deja el SQL embebido siempre en LF, compile
//!     donde compile.
//!  2. `prepare_database` (el frontend lo llama antes de `Database.load`)
//!     re-sella las filas de `_sqlx_migrations` cuyo checksum corresponde a
//!     la misma migración con otro final de línea (p. ej. las bases de los
//!     clientes creadas por el .exe v0.2.0, que quedaron con CRLF).
//!     Solo toca filas cuyo contenido es idéntico salvo por `\r`; una
//!     migración realmente distinta no se toca y sqlx la sigue rechazando.

use sha2::{Digest, Sha384};
use sqlx::sqlite::SqliteConnectOptions;
use sqlx::{ConnectOptions, Row};
use tauri::Manager;
use tauri_plugin_sql::Migration;

pub const DB_FILE: &str = "astrim_gym.db";

/// SQL con finales de línea LF (canónico), sin importar cómo se compiló.
fn to_lf(sql: &'static str) -> &'static str {
    if sql.contains('\r') {
        Box::leak(sql.replace("\r\n", "\n").into_boxed_str())
    } else {
        sql
    }
}

pub fn normalize_migrations(migrations: Vec<Migration>) -> Vec<Migration> {
    migrations
        .into_iter()
        .map(|mut m| {
            m.sql = to_lf(m.sql);
            m
        })
        .collect()
}

fn sha384(bytes: &[u8]) -> Vec<u8> {
    Sha384::digest(bytes).to_vec()
}

async fn reseal(path: &std::path::Path, migrations: &[Migration]) -> Result<u32, String> {
    let mut conn = SqliteConnectOptions::new()
        .filename(path)
        .create_if_missing(false)
        .connect()
        .await
        .map_err(|e| e.to_string())?;

    let has_table: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = '_sqlx_migrations'",
    )
    .fetch_one(&mut conn)
    .await
    .map_err(|e| e.to_string())?;
    if has_table == 0 {
        return Ok(0);
    }

    let rows = sqlx::query("SELECT version, checksum FROM _sqlx_migrations")
        .fetch_all(&mut conn)
        .await
        .map_err(|e| e.to_string())?;

    let mut fixed = 0u32;
    for row in rows {
        let version: i64 = row.try_get("version").map_err(|e| e.to_string())?;
        let stored: Vec<u8> = row.try_get("checksum").map_err(|e| e.to_string())?;
        let Some(m) = migrations.iter().find(|m| m.version == version) else {
            continue;
        };
        let lf = m.sql.replace("\r\n", "\n");
        let expected = sha384(m.sql.as_bytes());
        if stored == expected {
            continue;
        }
        let same_content = stored == sha384(lf.as_bytes())
            || stored == sha384(lf.replace('\n', "\r\n").as_bytes());
        if same_content {
            sqlx::query("UPDATE _sqlx_migrations SET checksum = ? WHERE version = ?")
                .bind(&expected)
                .bind(version)
                .execute(&mut conn)
                .await
                .map_err(|e| e.to_string())?;
            fixed += 1;
        }
    }
    Ok(fixed)
}

/// Llamado por el frontend antes de abrir la base. Nunca falla de forma
/// bloqueante: si algo sale mal se informa y el plugin intenta abrir igual.
#[tauri::command]
pub async fn prepare_database(app: tauri::AppHandle) -> Result<u32, String> {
    // Misma carpeta que usa tauri-plugin-sql para "sqlite:astrim_gym.db".
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let path = dir.join(DB_FILE);
    if !path.exists() {
        return Ok(0); // instalación nueva: la crea el plugin con checksums LF
    }
    reseal(&path, &crate::migrations()).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::migrate::{Migration as SqlxMigration, MigrationType, Migrator};
    use std::borrow::Cow;

    fn sqlx_migrator(ms: &[Migration]) -> Migrator {
        let list: Vec<SqlxMigration> = ms
            .iter()
            .map(|m| {
                SqlxMigration::new(
                    m.version,
                    Cow::Borrowed(m.description),
                    MigrationType::Simple,
                    Cow::Borrowed(m.sql),
                    false,
                )
            })
            .collect();
        Migrator {
            migrations: Cow::Owned(list),
            ..Migrator::DEFAULT
        }
    }

    /// Base de un cliente creada por el .exe v0.2.0 (checksums CRLF):
    /// sin reparar, sqlx la rechaza; reparada, la acepta.
    #[tokio::test]
    async fn reseals_crlf_database() {
        let Ok(src) = std::env::var("ASTRIM_TEST_DB") else {
            eprintln!("ASTRIM_TEST_DB no definido; test omitido");
            return;
        };
        let path = std::env::temp_dir().join(format!("astrim_reseal_{}.db", uuid::Uuid::new_v4()));
        std::fs::copy(&src, &path).unwrap();
        let ms = crate::migrations();

        let mut conn = SqliteConnectOptions::new().filename(&path).connect().await.unwrap();
        for m in &ms {
            let crlf = m.sql.replace('\n', "\r\n");
            sqlx::query("UPDATE _sqlx_migrations SET checksum = ? WHERE version = ?")
                .bind(sha384(crlf.as_bytes()))
                .bind(m.version)
                .execute(&mut conn)
                .await
                .unwrap();
        }
        let err = sqlx_migrator(&ms).run(&mut conn).await;
        assert!(err.is_err(), "sin reparar, sqlx debería rechazarla");
        drop(conn);

        assert_eq!(reseal(&path, &ms).await.unwrap(), ms.len() as u32);
        assert_eq!(reseal(&path, &ms).await.unwrap(), 0, "idempotente");

        let mut conn = SqliteConnectOptions::new().filename(&path).connect().await.unwrap();
        sqlx_migrator(&ms).run(&mut conn).await.expect("reparada, sqlx la acepta");
        let users: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
            .fetch_one(&mut conn).await.unwrap();
        assert!(users >= 1, "los datos se conservan");
        drop(conn);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn embedded_sql_is_lf() {
        assert!(crate::migrations().iter().all(|m| !m.sql.contains('\r')));
    }
}
