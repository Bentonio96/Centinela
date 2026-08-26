/**
 * Contenido base del dataset mock: títulos, descripciones y activos por
 * categoría de amenaza.
 *
 * Está escrito como datos y no como código para que agregar una categoría o
 * afinar la redacción no obligue a tocar el generador.
 */

import type { AffectedAsset, IncidentCategory, Severity } from '@/types';

type AssetKind = AffectedAsset['kind'];

export interface CategoryTemplate {
  readonly category: IncidentCategory;
  /** Frecuencia relativa dentro del dataset. Phishing abunda, el ransomware no. */
  readonly weight: number;
  /**
   * Bolsa ponderada de severidades: cada aparición suma una probabilidad.
   * Un ransomware casi nunca es "baja"; una vulnerabilidad casi nunca es "crítica".
   */
  readonly severityPool: readonly Severity[];
  readonly titles: readonly string[];
  /** Plantillas con los marcadores `{asset}` e `{ip}`. */
  readonly descriptions: readonly string[];
  readonly assetKinds: readonly AssetKind[];
  /** Si la amenaza tiene un origen de red identificable. */
  readonly hasSourceIp: boolean;
}

export const CATEGORY_TEMPLATES: readonly CategoryTemplate[] = [
  {
    category: 'phishing',
    weight: 22,
    severityPool: ['medium', 'medium', 'high', 'low'],
    titles: [
      'Campaña de phishing suplantando al área de Finanzas',
      'Correo fraudulento con enlace a portal de credenciales falso',
      'Suplantación de proveedor en cadena de facturación',
      'Phishing dirigido a cuentas con acceso privilegiado',
      'Mensaje masivo simulando restablecimiento de contraseña',
    ],
    descriptions: [
      'Se detectaron correos dirigidos a {asset} con un enlace a un portal que imita el inicio de sesión corporativo. El dominio fue registrado hace menos de 72 horas y resuelve a {ip}. El filtro de correo retuvo parte de la campaña, pero algunos mensajes llegaron a bandeja de entrada.',
      'Un usuario reportó un correo que solicitaba validar credenciales para evitar el bloqueo de su cuenta. El análisis de cabeceras confirma un remitente falsificado y una infraestructura de envío alojada en {ip}. Se revisan los accesos recientes de {asset}.',
      'La campaña reutiliza una plantilla legítima de notificaciones internas. Se identificó a {asset} entre los destinatarios que abrieron el mensaje; no hay evidencia de envío de credenciales hasta el momento.',
    ],
    assetKinds: ['account', 'endpoint'],
    hasSourceIp: true,
  },
  {
    category: 'malware',
    weight: 16,
    severityPool: ['high', 'medium', 'medium', 'critical'],
    titles: [
      'Detección de troyano de acceso remoto en estación de trabajo',
      'Ejecutable no firmado con persistencia en el registro',
      'Descarga de payload desde dominio recién registrado',
      'Actividad de infostealer sobre credenciales del navegador',
      'Macro maliciosa ejecutada desde documento adjunto',
    ],
    descriptions: [
      'El EDR bloqueó la ejecución de un binario no firmado en {asset} que intentó establecer persistencia mediante una clave de ejecución automática. El proceso realizó consultas DNS hacia infraestructura asociada a {ip}.',
      'Se observó un proceso hijo de la suite ofimática lanzando un intérprete de comandos en {asset}. El comportamiento coincide con la ejecución de una macro maliciosa. El equipo fue aislado de la red mientras se completa el análisis forense.',
      'Telemetría de {asset} muestra lectura del almacén de credenciales del navegador seguida de una conexión saliente a {ip}. Se forzó el cambio de contraseñas de las cuentas involucradas.',
    ],
    assetKinds: ['endpoint', 'server'],
    hasSourceIp: true,
  },
  {
    category: 'unauthorized-access',
    weight: 15,
    severityPool: ['high', 'high', 'critical', 'medium'],
    titles: [
      'Inicio de sesión exitoso desde geolocalización inusual',
      'Acceso a repositorio interno fuera de horario habitual',
      'Uso de credenciales de servicio desde red no corporativa',
      'Escalamiento de privilegios en controlador de dominio',
      'Sesión VPN activa con token de un empleado desvinculado',
    ],
    descriptions: [
      'Se registró un inicio de sesión válido sobre {asset} desde {ip}, una dirección sin historial previo para esa cuenta y en un país donde la organización no opera. El segundo factor fue aprobado, lo que sugiere fatiga de notificaciones o compromiso del dispositivo.',
      'La cuenta asociada a {asset} accedió a recursos que no forman parte de su perfil habitual, en una ventana de 40 minutos y desde {ip}. Se revocaron las sesiones activas y se solicitó verificación al titular.',
      'Se detectó el uso de una credencial de servicio de {asset} desde una red externa. Las credenciales de servicio deberían restringirse al segmento interno; se investiga cómo quedaron expuestas.',
    ],
    assetKinds: ['account', 'server', 'service'],
    hasSourceIp: true,
  },
  {
    category: 'vulnerability',
    weight: 14,
    severityPool: ['medium', 'medium', 'low', 'high'],
    titles: [
      'Dependencia con vulnerabilidad conocida en servicio productivo',
      'Servidor sin parche crítico del ciclo mensual',
      'Configuración TLS obsoleta expuesta a internet',
      'Panel administrativo accesible sin restricción de red',
      'Bucket de almacenamiento con permisos de lectura pública',
    ],
    descriptions: [
      'El escaneo programado identificó en {asset} una versión de la dependencia afectada por una vulnerabilidad de ejecución remota. No hay indicios de explotación; la corrección está planificada en la próxima ventana de mantenimiento.',
      'El activo {asset} quedó fuera del ciclo de parcheo por una excepción vencida. Continúa expuesto a una vulnerabilidad con exploit público disponible.',
      'Se encontró {asset} respondiendo con suites de cifrado obsoletas. El hallazgo no implica compromiso, pero incumple la línea base de configuración interna.',
    ],
    assetKinds: ['server', 'service'],
    hasSourceIp: false,
  },
  {
    category: 'data-leak',
    weight: 10,
    severityPool: ['critical', 'high', 'high'],
    titles: [
      'Exfiltración de base de datos de clientes',
      'Volumen inusual de descargas desde almacenamiento interno',
      'Envío de información sensible a dominio externo',
      'Credenciales de la organización publicadas en foro',
      'Reenvío automático de correo hacia buzón personal',
    ],
    descriptions: [
      'Se detectó una transferencia saliente de gran volumen desde {asset} hacia {ip}, fuera de los patrones habituales y en horario nocturno. La revisión preliminar sugiere acceso a registros con datos personales.',
      'Un conjunto de credenciales con el dominio corporativo apareció publicado en un foro de acceso restringido. Se contrastó contra el directorio y se identificaron cuentas activas, entre ellas la de {asset}.',
      'Se identificó una regla de reenvío automático creada sobre {asset} que dirigía la correspondencia a un buzón externo. La regla no fue creada por el titular ni por la mesa de servicio.',
    ],
    assetKinds: ['server', 'service', 'account'],
    hasSourceIp: true,
  },
  {
    category: 'ddos',
    weight: 9,
    severityPool: ['high', 'medium', 'medium'],
    titles: [
      'Saturación del portal público por tráfico volumétrico',
      'Ataque de amplificación DNS contra el borde de red',
      'Degradación de la API por peticiones automatizadas',
      'Agotamiento de conexiones en el balanceador',
    ],
    descriptions: [
      'El tráfico hacia {asset} se multiplicó por 40 respecto de la línea base en menos de cinco minutos, con origen distribuido y concentración en {ip}. La mitigación del proveedor absorbió la mayor parte del volumen.',
      'Se observó un patrón de amplificación dirigido a {asset}. La latencia del servicio aumentó de forma sostenida antes de que se activaran las reglas de limitación por tasa.',
      'Peticiones automatizadas sin identificación de agente saturaron los recursos de {asset}. El origen predominante fue {ip}, ya incorporado a la lista de bloqueo del borde.',
    ],
    assetKinds: ['service', 'network', 'server'],
    hasSourceIp: true,
  },
  {
    category: 'ransomware',
    weight: 7,
    severityPool: ['critical', 'critical', 'high'],
    titles: [
      'Cifrado de recursos compartidos en servidor de archivos',
      'Nota de rescate detectada en estación de trabajo',
      'Intento de borrado de copias de seguridad',
      'Despliegue de cifrador mediante herramienta de administración',
    ],
    descriptions: [
      'Se detectó cifrado masivo de archivos en {asset} junto con la eliminación de instantáneas de volumen. El servidor fue desconectado de la red y se activó el procedimiento de recuperación desde respaldo.',
      'Apareció una nota de rescate en {asset} tras un pico de operaciones de escritura. La propagación lateral se contuvo en el segmento afectado; se investiga el punto de entrada inicial.',
      'Se registró un intento de eliminación de respaldos desde una cuenta con privilegios elevados sobre {asset}, patrón habitual previo al despliegue del cifrador. La operación fue bloqueada por la política de retención inmutable.',
    ],
    assetKinds: ['server', 'endpoint'],
    hasSourceIp: true,
  },
  {
    category: 'social-engineering',
    weight: 7,
    severityPool: ['medium', 'high', 'low'],
    titles: [
      'Llamada suplantando a la mesa de ayuda interna',
      'Solicitud de transferencia atribuida a la gerencia',
      'Intento de registro de segundo factor por un tercero',
      'Contacto por mensajería ofreciendo soporte técnico falso',
    ],
    descriptions: [
      'El titular de {asset} recibió una llamada de alguien que se identificó como parte de la mesa de ayuda y solicitó el código de verificación. El usuario no entregó el código y reportó el hecho de inmediato.',
      'Se recibió una solicitud de pago urgente atribuida a la gerencia, con un tono y un formato que imitan la comunicación interna habitual. El proceso de doble validación detuvo la operación antes del desembolso.',
      'Se registró un intento de inscripción de un nuevo segundo factor sobre {asset} desde un dispositivo desconocido, precedido de un contacto telefónico al titular.',
    ],
    assetKinds: ['account', 'endpoint'],
    hasSourceIp: false,
  },
];

/** Analistas del equipo de respuesta, para el campo `assignee`. */
export const ANALYSTS: readonly string[] = [
  'Camila Rojas',
  'Diego Fuentes',
  'Valentina Soto',
  'Matías Herrera',
  'Fernanda Ríos',
  'Ignacio Peña',
  'Antonia Vidal',
  'Sebastián Muñoz',
];

/** Nombres de activo por tipo, con nomenclatura de inventario. */
export const ASSET_NAMES: Readonly<Record<AssetKind, readonly string[]>> = {
  server: [
    'srv-db-prod-01',
    'srv-db-prod-03',
    'srv-files-02',
    'srv-app-web-04',
    'srv-backup-01',
    'srv-mail-relay-02',
  ],
  endpoint: [
    'ep-lab-0142',
    'ep-fin-0231',
    'ep-rrhh-0087',
    'ep-dev-0455',
    'ep-vent-0319',
    'ep-ops-0208',
  ],
  account: [
    'c.rojas@empresa.cl',
    'p.alvarez@empresa.cl',
    'admin.backup',
    'svc-integraciones',
    'm.torres@empresa.cl',
    'j.contreras@empresa.cl',
  ],
  service: [
    'api-facturacion',
    'portal-clientes',
    'sso-corporativo',
    'gateway-pagos',
    'almacenamiento-docs',
  ],
  network: ['vpn-gw-01', 'fw-borde-02', 'balanceador-web', 'segmento-dmz'],
};
