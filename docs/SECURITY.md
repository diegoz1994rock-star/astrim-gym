# Seguridad — ASTRIM GYM

## Principios (válidos desde la Fase 1, aunque hoy todo sea local)

1. **La UI nunca es la única barrera.** Ocultar un botón no es control de acceso. Las reglas de
   quién puede hacer qué viven en `src/lib/services`.
2. **La pertenencia a un gimnasio siempre se valida en el backend/servicio**, nunca se confía en un
   `gymId` que "dice" tener el cliente. Hoy el "backend" es el proceso Rust local; en la fase de
   Firebase, serán las reglas de seguridad de Firestore las que validen esto contra el token del
   usuario autenticado.
3. **Contraseñas nunca en texto plano.** Se almacenan con `bcrypt` (`password_hash`).
4. **Bloqueo de licencia = bloqueo total, no borrado.** Si `gyms.license_status` es `SUSPENDED` o
   `CANCELLED`, el login se rechaza para todo usuario de ese gimnasio (`src/lib/services/authService.ts`),
   pero los datos permanecen intactos en la base de datos.

## Estado actual (Fase 1)

- Autenticación local contra la tabla `users` de SQLite.
- Sesión en memoria (contexto de React); se pierde al cerrar la aplicación — es el comportamiento
  esperado para una app de escritorio de un solo usuario por sesión.
- No hay comunicación de red: no aplica todavía cifrado en tránsito ni tokens.

## Pendiente para fases futuras (no implementar todavía)

- Reglas de seguridad de Firestore que validen rol + `gymId` del token, no del payload.
- Expiración de sesión / refresco de token al conectar con Firebase Auth.
- Auditoría de acciones administrativas sensibles (cambios de licencia, eliminación de clientes).
