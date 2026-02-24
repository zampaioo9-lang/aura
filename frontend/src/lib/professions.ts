export interface ProfessionCategory {
  category: string;
  professions: string[];
}

export const PROFESSION_CATEGORIES: ProfessionCategory[] = [
  {
    category: 'Salud y Bienestar',
    professions: [
      'Médico/a General', 'Médico/a Cardiólogo/a', 'Médico/a Dermatólogo/a',
      'Médico/a Ginecólogo/a', 'Médico/a Pediatra', 'Médico/a Traumatólogo/a',
      'Médico/a Neurólogo/a', 'Médico/a Oftalmólogo/a', 'Médico/a Otorrinolaringólogo/a',
      'Médico/a Urólogo/a', 'Médico/a Endocrinólogo/a', 'Médico/a Psiquiatra',
      'Odontólogo/a', 'Nutricionista', 'Fisioterapeuta', 'Kinesiólogo/a',
      'Fonoaudiólogo/a', 'Enfermero/a', 'Podólogo/a', 'Óptico/a', 'Quiropráctico/a',
    ],
  },
  {
    category: 'Salud Mental',
    professions: [
      'Psicólogo/a', 'Psicoterapeuta', 'Coach de Vida', 'Coach Ejecutivo',
      'Coach Nutricional', 'Terapeuta Holístico/a', 'Terapeuta Ocupacional',
      'Consejero/a Familiar',
    ],
  },
  {
    category: 'Belleza y Estética',
    professions: [
      'Estilista', 'Barbero/a', 'Maquillador/a', 'Manicurista',
      'Cosmetólogo/a', 'Esteticista', 'Depilador/a', 'Tatuador/a', 'Piercer',
    ],
  },
  {
    category: 'Bienestar y Relajación',
    professions: [
      'Masajista', 'Spa / Centro de Relajación', 'Instructor/a de Yoga',
      'Instructor/a de Meditación', 'Acupunturista', 'Reflexólogo/a',
      'Aromaterapeuta', 'Reikista',
    ],
  },
  {
    category: 'Fitness y Deporte',
    professions: [
      'Entrenador/a Personal', 'Preparador/a Físico/a', 'Instructor/a de Pilates',
      'Instructor/a de CrossFit', 'Instructor/a de Natación',
      'Instructor/a de Artes Marciales', 'Instructor/a de Baile',
    ],
  },
  {
    category: 'Tecnología y Digital',
    professions: [
      'Desarrollador/a Web', 'Desarrollador/a Móvil', 'Diseñador/a Gráfico/a',
      'Diseñador/a UX/UI', 'Community Manager', 'Especialista en Marketing Digital',
      'Especialista en SEO', 'Fotógrafo/a', 'Videógrafo/a', 'Editor/a de Video',
      'Informático/a / Soporte Técnico',
    ],
  },
  {
    category: 'Educación y Formación',
    professions: [
      'Profesor/a Particular', 'Tutor/a Académico/a', 'Profesor/a de Idiomas',
      'Profesor/a de Música', 'Instructor/a de Conducir', 'Capacitador/a Empresarial',
    ],
  },
  {
    category: 'Construcción y Hogar',
    professions: [
      'Arquitecto/a', 'Ingeniero/a Civil', 'Albañil', 'Plomero/a', 'Electricista',
      'Carpintero/a', 'Pintor/a', 'Cerrajero/a', 'Vidriero/a', 'Techista',
      'Gasista', 'Climatización / Aire Acondicionado', 'Fumigador/a',
      'Jardinero/a / Paisajista', 'Diseñador/a de Interiores',
    ],
  },
  {
    category: 'Servicios Profesionales',
    professions: [
      'Abogado/a', 'Contador/a', 'Escribano/a', 'Traductor/a',
      'Consultor/a de Negocios', 'Asesor/a Financiero/a', 'Asesor/a Inmobiliario/a',
      'Gestor/a', 'Despachante de Aduanas',
    ],
  },
  {
    category: 'Automotriz',
    professions: [
      'Mecánico/a Automotriz', 'Electricista Automotriz',
      'Chapista / Pintor/a Automotriz', 'Cerrajero/a Automotriz',
      'Detailing / Estética Vehicular',
    ],
  },
  {
    category: 'Mascotas',
    professions: [
      'Veterinario/a', 'Peluquero/a Canino/a', 'Adiestrador/a de Mascotas',
      'Paseador/a de Perros', 'Cuidador/a de Mascotas',
    ],
  },
  {
    category: 'Eventos y Entretenimiento',
    professions: [
      'Organizador/a de Eventos', 'DJ', 'Animador/a', 'Catering / Chef Privado',
      'Decorador/a de Eventos', 'Sonidista',
    ],
  },
  {
    category: 'Otros',
    professions: [
      'Costurero/a / Modista', 'Zapatero/a', 'Relojero/a', 'Técnico/a en Celulares',
      'Técnico/a en Electrodomésticos', 'Mudanza / Flete', 'Limpieza del Hogar',
      'Niñera / Cuidador/a', 'Cuidador/a de Adultos Mayores',
    ],
  },
];

export const ALL_PROFESSIONS = PROFESSION_CATEGORIES.flatMap((c) => c.professions);
