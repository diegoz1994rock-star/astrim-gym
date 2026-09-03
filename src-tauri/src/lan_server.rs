// Servidor LAN embebido: es el único puente entre un dispositivo externo
// (tablet de recepción) y la lógica real de la app, que vive en TypeScript
// (accessService/deviceService). Este archivo NUNCA valida códigos ni
// registra asistencia por su cuenta: cada petición HTTP se reenvía como
// evento al frontend, que ejecuta el mismo código que usa /kiosko, y la
// respuesta vuelve por el comando respond_lan_request. Así se evita
// duplicar evaluateAccess/accessService en Rust.
use std::collections::HashMap;
use std::net::UdpSocket;
use std::sync::mpsc::{channel, Sender};
use std::sync::Mutex;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};

const HTTP_PORT: u16 = 47822;
const DISCOVERY_PORT: u16 = 47823;
const DISCOVERY_MAGIC: &[u8] = b"ASTRIM_DISCOVER";
const RESPONSE_TIMEOUT_SECS: u64 = 10;

pub struct PendingResponses(pub Mutex<HashMap<String, Sender<(u16, String)>>>);

pub fn start(app_handle: AppHandle) {
    app_handle.manage(PendingResponses(Mutex::new(HashMap::new())));

    let http_handle = app_handle.clone();
    std::thread::spawn(move || run_http_server(http_handle));
    std::thread::spawn(run_discovery_responder);
}

fn run_http_server(app_handle: AppHandle) {
    let server = match tiny_http::Server::http(format!("0.0.0.0:{HTTP_PORT}")) {
        Ok(server) => server,
        Err(err) => {
            eprintln!("No se pudo iniciar el servidor LAN en el puerto {HTTP_PORT}: {err}");
            return;
        }
    };

    for mut request in server.incoming_requests() {
        let path = request.url().to_string();

        // El WebView de la tablet trata este servidor como un origen
        // cruzado (su propio origen es algo como https://tauri.localhost),
        // así que sin cabeceras CORS el navegador descarta la respuesta
        // aunque la conexión TCP haya funcionado perfectamente. Se agregan
        // a TODAS las respuestas, incluida la del preflight OPTIONS.
        if request.method() == &tiny_http::Method::Options {
            let _ = request.respond(cors_response(String::new(), 204));
            continue;
        }

        // /ping es una simple prueba de vida del proceso de escritorio: no
        // pasa por el puente al frontend (no depende de que la ventana esté
        // respondiendo), solo confirma que este servidor LAN está arriba.
        if path == "/ping" {
            let _ = request.respond(cors_response("{\"status\":\"ok\"}".to_string(), 200));
            continue;
        }

        let mut body = String::new();
        let _ = request.as_reader().read_to_string(&mut body);

        let authorization = request
            .headers()
            .iter()
            .find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("authorization"))
            .map(|h| h.value.as_str().to_string());

        let request_id = uuid::Uuid::new_v4().to_string();
        let (tx, rx) = channel::<(u16, String)>();

        {
            let state = app_handle.state::<PendingResponses>();
            state.0.lock().unwrap().insert(request_id.clone(), tx);
        }

        let payload = serde_json::json!({
            "requestId": request_id,
            "path": path,
            "body": body,
            "authorization": authorization,
        });
        let _ = app_handle.emit("lan-request", payload);

        let (status, response_body) = rx
            .recv_timeout(Duration::from_secs(RESPONSE_TIMEOUT_SECS))
            .unwrap_or_else(|_| (504, "{\"error\":\"timeout\"}".to_string()));

        {
            let state = app_handle.state::<PendingResponses>();
            state.0.lock().unwrap().remove(&request_id);
        }

        let _ = request.respond(cors_response(response_body, status));
    }
}

/// Arma una respuesta JSON con las cabeceras CORS que el WebView de Android
/// necesita para no descartar la respuesta de este origen cruzado.
fn cors_response(body: String, status: u16) -> tiny_http::Response<std::io::Cursor<Vec<u8>>> {
    let content_type =
        tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap();
    let allow_origin = tiny_http::Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap();
    let allow_headers = tiny_http::Header::from_bytes(
        &b"Access-Control-Allow-Headers"[..],
        &b"Content-Type, Authorization"[..],
    )
    .unwrap();
    let allow_methods =
        tiny_http::Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET, POST, OPTIONS"[..]).unwrap();

    tiny_http::Response::from_string(body)
        .with_status_code(status)
        .with_header(content_type)
        .with_header(allow_origin)
        .with_header(allow_headers)
        .with_header(allow_methods)
}

/// Responde a un paquete de descubrimiento UDP con el puerto del servidor
/// HTTP, para que la tablet no tenga que pedir la IP a mano en la red local.
fn run_discovery_responder() {
    let socket = match UdpSocket::bind(format!("0.0.0.0:{DISCOVERY_PORT}")) {
        Ok(socket) => socket,
        Err(err) => {
            eprintln!("No se pudo iniciar el descubrimiento LAN en el puerto {DISCOVERY_PORT}: {err}");
            return;
        }
    };
    let mut buffer = [0u8; 256];
    loop {
        if let Ok((size, source)) = socket.recv_from(&mut buffer) {
            if &buffer[..size] == DISCOVERY_MAGIC {
                let response = serde_json::json!({ "port": HTTP_PORT }).to_string();
                let _ = socket.send_to(response.as_bytes(), source);
            }
        }
    }
}

#[tauri::command]
pub fn respond_lan_request(app_handle: AppHandle, request_id: String, status: u16, body: String) {
    let state = app_handle.state::<PendingResponses>();
    let sender = state.0.lock().unwrap().remove(&request_id);
    if let Some(tx) = sender {
        let _ = tx.send((status, body));
    }
}

#[tauri::command]
pub fn get_local_lan_ip() -> String {
    match UdpSocket::bind("0.0.0.0:0").and_then(|socket| {
        socket.connect("8.8.8.8:80")?;
        socket.local_addr()
    }) {
        Ok(addr) => addr.ip().to_string(),
        Err(_) => "127.0.0.1".to_string(),
    }
}
