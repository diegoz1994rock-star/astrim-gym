// Cliente de descubrimiento: manda un broadcast UDP en la red local y
// devuelve la IP del primer computador que responda. Nunca decide nada de
// negocio aquí — solo resuelve la dirección; toda la vinculación/PIN sigue
// yendo por HTTP al mismo accessService/deviceService del computador
// principal (ver src/lib/lanClient.ts).
use std::net::UdpSocket;
use std::time::Duration;

const DISCOVERY_PORT: u16 = 47823;
const DISCOVERY_MAGIC: &[u8] = b"ASTRIM_DISCOVER";

#[tauri::command]
pub fn discover_server() -> Option<String> {
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.set_broadcast(true).ok()?;
    socket.set_read_timeout(Some(Duration::from_secs(3))).ok()?;
    socket
        .send_to(DISCOVERY_MAGIC, format!("255.255.255.255:{DISCOVERY_PORT}"))
        .ok()?;

    let mut buffer = [0u8; 256];
    let (_size, source) = socket.recv_from(&mut buffer).ok()?;
    Some(source.ip().to_string())
}
