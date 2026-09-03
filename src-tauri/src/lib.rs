use tauri_plugin_sql::{Migration, MigrationKind};

mod lan_server;

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "init_schema",
            sql: include_str!("../migrations/0001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed_demo_data",
            sql: include_str!("../migrations/0002_seed_demo.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "client_document_unique",
            sql: include_str!("../migrations/0003_client_document_unique.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "trainers_extra_fields",
            sql: include_str!("../migrations/0004_trainers_extra_fields.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "membership_plan_name_unique",
            sql: include_str!("../migrations/0005_membership_plan_name_unique.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "payments_concept",
            sql: include_str!("../migrations/0006_payments_concept.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "routines_details",
            sql: include_str!("../migrations/0007_routines_details.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "exercises_catalog",
            sql: include_str!("../migrations/0008_exercises_catalog.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "attendance_details",
            sql: include_str!("../migrations/0009_attendance_details.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "measurements_extra_fields",
            sql: include_str!("../migrations/0010_measurements_extra_fields.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "gym_contact_info",
            sql: include_str!("../migrations/0011_gym_contact_info.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "exercises_catalog_expansion",
            sql: include_str!("../migrations/0012_exercises_catalog_expansion.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "routine_exercise_cardio_config",
            sql: include_str!("../migrations/0013_routine_exercise_cardio_config.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "clients_body_measurements",
            sql: include_str!("../migrations/0014_clients_body_measurements.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 15,
            description: "exercise_instructions",
            sql: include_str!("../migrations/0015_exercise_instructions.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 16,
            description: "attendance_pin_system",
            sql: include_str!("../migrations/0016_attendance_pin_system.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 17,
            description: "gym_devices",
            sql: include_str!("../migrations/0017_gym_devices.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 18,
            description: "client_deactivation_tracking",
            sql: include_str!("../migrations/0018_client_deactivation_tracking.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:astrim_gym.db", migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            lan_server::respond_lan_request,
            lan_server::get_local_lan_ip
        ])
        .setup(|app| {
            lan_server::start(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
