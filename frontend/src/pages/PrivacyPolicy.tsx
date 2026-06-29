export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidad</h1>
        <p className="text-sm text-gray-500 mb-10">Última actualización: 20 de junio de 2026</p>

        <div className="space-y-8 text-gray-700">
          <section>
            <p>
              Esta Política de Privacidad se emite de conformidad con la Ley Federal de Protección de Datos
              Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento, aplicables en México, y
              describe cómo Aliax.io recopila, usa, comparte y protege tus datos personales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Información que recopilamos</h2>
            <p>Aliax.io recopila la siguiente información cuando usas nuestra plataforma:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Nombre, correo electrónico y número de teléfono</li>
              <li>Información de citas y reservas</li>
              <li>Datos de uso de la plataforma</li>
              <li>Datos de pago, procesados directamente por nuestros proveedores de pago (Stripe y PayPal); Aliax.io no almacena los datos completos de tu tarjeta</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Cómo usamos tu información</h2>
            <p>Utilizamos tu información para:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Gestionar y confirmar tus reservas</li>
              <li>Enviarte notificaciones sobre tus citas por WhatsApp y correo electrónico</li>
              <li>Recordatorios de citas programadas</li>
              <li>Procesar pagos y suscripciones a través de Stripe y PayPal</li>
              <li>Enviar correos transaccionales y de notificación a través de Resend</li>
              <li>Mejorar nuestros servicios</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Notificaciones por WhatsApp</h2>
            <p>
              Al proporcionar tu número de teléfono, aceptas recibir notificaciones relacionadas con tus reservas
              a través de WhatsApp, mediante la API oficial de WhatsApp Business de Meta. Estos mensajes incluyen
              confirmaciones, recordatorios y cancelaciones de citas. Puedes cancelar estas notificaciones en
              cualquier momento contactándonos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Compartir información</h2>
            <p>
              No vendemos tu información personal. La compartimos únicamente con proveedores de servicios
              necesarios para operar la plataforma, quienes actúan como encargados de tus datos conforme a la
              LFPDPPP:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Stripe</strong> y <strong>PayPal</strong>: procesamiento de pagos y suscripciones</li>
              <li><strong>Resend</strong>: envío de correos electrónicos transaccionales y de notificación</li>
              <li><strong>Meta (WhatsApp Business API)</strong>: envío de notificaciones y recordatorios por WhatsApp</li>
              <li><strong>Neon</strong>: alojamiento de nuestra base de datos</li>
              <li><strong>Cloudinary</strong>: almacenamiento de imágenes y archivos multimedia</li>
              <li><strong>Vercel</strong>: alojamiento de la plataforma web</li>
            </ul>
            <p className="mt-2">
              Estos proveedores solo reciben los datos necesarios para prestar su servicio y están obligados
              contractualmente a protegerlos conforme a sus propias políticas de privacidad.
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
              contra acceso no autorizado. Nuestros proveedores de infraestructura (Stripe, PayPal, Vercel,
              Neon y Cloudinary) cuentan, de forma colectiva, con certificaciones de seguridad reconocidas a
              nivel internacional como ISO 27001, SOC 2 Type II y PCI-DSS, y aplican cifrado de datos tanto en
              tránsito (TLS) como en reposo.
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
