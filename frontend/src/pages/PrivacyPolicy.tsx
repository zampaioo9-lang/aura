export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidad</h1>
        <p className="text-sm text-gray-500 mb-10">Última actualización: 23 de febrero de 2026</p>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Información que recopilamos</h2>
            <p>Aliax.io recopila la siguiente información cuando usas nuestra plataforma:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Nombre, correo electrónico y número de teléfono</li>
              <li>Información de citas y reservas</li>
              <li>Datos de uso de la plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Cómo usamos tu información</h2>
            <p>Utilizamos tu información para:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Gestionar y confirmar tus reservas</li>
              <li>Enviarte notificaciones sobre tus citas por WhatsApp y correo electrónico</li>
              <li>Recordatorios de citas programadas</li>
              <li>Mejorar nuestros servicios</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Notificaciones por WhatsApp</h2>
            <p>
              Al proporcionar tu número de teléfono, aceptas recibir notificaciones relacionadas con tus reservas
              a través de WhatsApp. Estos mensajes incluyen confirmaciones, recordatorios y cancelaciones de citas.
              Puedes cancelar estas notificaciones en cualquier momento contactándonos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Compartir información</h2>
            <p>
              No vendemos ni compartimos tu información personal con terceros, excepto con proveedores de servicios
              necesarios para operar la plataforma (como servicios de mensajería y almacenamiento en la nube).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Retención de datos</h2>
            <p>
              Conservamos tu información mientras tengas una cuenta activa en Aliax.io. Puedes solicitar la
              eliminación de tus datos en cualquier momento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Seguridad</h2>
            <p>
              Implementamos medidas de seguridad técnicas y organizativas para proteger tu información personal
              contra acceso no autorizado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Tus derechos</h2>
            <p>
              Tienes derecho a acceder, corregir o eliminar tu información personal. Para ejercer estos derechos,
              contáctanos en:{' '}
              <a href="mailto:privacidad@aliax.io" className="text-indigo-600 hover:underline">
                privacidad@aliax.io
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Cambios a esta política</h2>
            <p>
              Notificaremos cualquier cambio significativo a esta política a través de la plataforma o por
              correo electrónico.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Contacto</h2>
            <p>
              Si tienes preguntas sobre esta política, contáctanos en:{' '}
              <a href="mailto:privacidad@aliax.io" className="text-indigo-600 hover:underline">
                privacidad@aliax.io
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <a href="/" className="text-indigo-600 hover:underline text-sm">← Volver al inicio</a>
        </div>
      </div>
    </div>
  );
}
