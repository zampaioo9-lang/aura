export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidad</h1>
        <p className="text-sm text-gray-500 mb-10">Última actualización: 2 de julio de 2026</p>

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
              <li>
                Si tu profesional utiliza el módulo de Historia Clínica: datos de salud como motivo de consulta,
                antecedentes personales y familiares, notas de sesión y demás información compartida durante el
                proceso terapéutico. Estos son <strong>datos personales sensibles</strong> conforme al Art. 3,
                fracción VI de la LFPDPPP — ver sección 2.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Datos sensibles y consentimiento expreso</h2>
            <p>
              Los datos de salud e historial clínico registrados a través del módulo de Historia Clínica son datos
              personales sensibles. Conforme al Art. 9 de la LFPDPPP, su tratamiento requiere tu{' '}
              <strong>consentimiento expreso</strong> — no basta con aceptar esta Política de Privacidad de forma
              general.
            </p>
            <p className="mt-2">
              El profesional que te atiende es responsable de solicitar y documentar tu consentimiento expreso
              antes de registrar tus datos de salud en la plataforma. Aliax.io actúa como encargado de esos datos:
              los almacena y procesa únicamente conforme a las instrucciones del profesional y para los fines aquí
              descritos, y no los utiliza con ningún otro propósito.
            </p>
            <p className="mt-2">
              Si tu profesional utiliza la función de generación de notas clínicas con inteligencia artificial,
              el texto de la descripción de sesión se envía a nuestro proveedor de IA (ver sección 5). Antes de
              este envío, Aliax.io sustituye automáticamente tu nombre por un identificador genérico, de modo que
              el proveedor de IA no recibe datos que te identifiquen directamente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Cómo usamos tu información</h2>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Notificaciones por WhatsApp</h2>
            <p>
              Al proporcionar tu número de teléfono, aceptas recibir notificaciones relacionadas con tus reservas
              a través de WhatsApp, mediante la API oficial de WhatsApp Business de Meta. Estos mensajes incluyen
              confirmaciones, recordatorios y cancelaciones de citas. Puedes cancelar estas notificaciones en
              cualquier momento contactándonos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Compartir información</h2>
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
              <li>
                <strong>Anthropic (modelos Claude)</strong>: cuando tu profesional usa la función de notas
                clínicas o de coincidencia con inteligencia artificial. El texto enviado no incluye tu nombre —
                ver sección 2
              </li>
            </ul>
            <p className="mt-2">
              Estos proveedores solo reciben los datos necesarios para prestar su servicio y están obligados
              contractualmente a protegerlos conforme a sus propias políticas de privacidad.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Retención de datos</h2>
            <p>
              Conservamos tu información mientras tengas una cuenta activa en Aliax.io. Puedes solicitar la
              eliminación de tus datos en cualquier momento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Seguridad</h2>
            <p>
              Implementamos medidas de seguridad técnicas y organizativas para proteger tu información personal
              contra acceso no autorizado. Nuestros proveedores de infraestructura (Stripe, PayPal, Vercel,
              Neon y Cloudinary) cuentan, de forma colectiva, con certificaciones de seguridad reconocidas a
              nivel internacional como ISO 27001, SOC 2 Type II y PCI-DSS, y aplican cifrado de datos tanto en
              tránsito (TLS) como en reposo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Tus derechos (ARCO)</h2>
            <p>
              Tienes derecho a <strong>Acceder</strong> a tus datos personales, <strong>Rectificarlos</strong> si
              son inexactos, solicitar su <strong>Cancelación</strong>, y <strong>Oponerte</strong> a su
              tratamiento para fines específicos. Para ejercer estos derechos, contáctanos en:{' '}
              <a href="mailto:privacidad@aliax.io" className="text-indigo-600 hover:underline">
                privacidad@aliax.io
              </a>
            </p>
            <p className="mt-2">
              Si eres paciente de un profesional que usa Aliax.io y no tienes cuenta en la plataforma, puedes
              ejercer estos derechos directamente con tu profesional o escribiendo al correo anterior — te
              responderemos en coordinación con él, ya que es quien mantiene la relación clínica contigo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Cambios a esta política</h2>
            <p>
              Notificaremos cualquier cambio significativo a esta política a través de la plataforma o por
              correo electrónico.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contacto</h2>
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
