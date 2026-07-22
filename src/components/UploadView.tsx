import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Sparkles, 
  Bot, 
  RefreshCw, 
  Save, 
  HelpCircle,
  Clock,
  Zap,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Printer,
  ChevronRight,
  UserPlus,
  BrainCircuit,
  Edit3,
  AlertCircle,
  X,
  Check,
  Info,
  Plus,
  Trash2
} from 'lucide-react';
import { DocumentType, User as UserType } from '../types';
import { safeStorage } from '../utils/storage';
import { saveDocument } from '../utils/fileSaver';
import { DEFAULT_RECIPIENTS } from '../defaultRecipients';

interface UploadViewProps {
  currentUser: UserType;
  onDocumentAdded: () => void;
}

const SAMPLE_DOCS = [
  {
    id: 'sample-1',
    label: 'I.E. N° 1024 - Solicitud de Infraestructura (PDF)',
    text: `Asociación de Padres de Familia (APAFA)
Señor Director Regional de Educación de Lima Metropolitana
ASUNTO: Solicitud urgente de evaluación de infraestructura pabellón B

Mediante el presente, los padres de familia firmantes exponemos que el pabellón B de la Institución Educativa N° 1024 presenta rajaduras severas en las columnas y filtración de agua pluvial en el segundo piso. Esta situación pone en riesgo a los 120 alumnos que estudian allí.
Se estima que el presupuesto requerido para las reparaciones es de S/. 12,500.00. Solicitamos el envío inmediato de un inspector técnico para autorizar la reparación de urgencia.

Atentamente,
APAFA I.E. N° 1024
Lima, 18 de Julio de 2026`
  },
  {
    id: 'sample-2',
    label: 'Memorando de Dirección de Presupuestos (Word)',
    text: `DIRECCIÓN GENERAL DE ADMINISTRACIÓN
MEMORANDO N° 088-2026-DGA
PARA: Oficina de Adquisiciones y Logística
DE: Dirección de Planificación y Presupuestos
FECHA: 16 de Julio de 2026

Por medio del presente, se hace de su conocimiento que la partida presupuestal N° 4022 destinada al equipamiento tecnológico de las sedes periféricas ha sido aprobada con un fondo asignado de S/. 45,000.00. 
Se le instruye iniciar la cotización de 15 computadoras de escritorio bajo las especificaciones técnicas estipuladas. El plazo máximo para la presentación de propuestas es el 30 de Julio.

Atentamente,
Lic. Héctor Romero`
  },
  {
    id: 'sample-3',
    label: 'Resultados de CdD 3.1 - Oficina de Planificación (Word)',
    text: `RESOLUCIÓN EJECUTIVA Y REPORTE DE EVALUACIÓN - COMPROMISOS DE DESEMPEÑO 2026
UGEL BELLAVISTA - GOBIERNO REGIONAL DE SAN MARTÍN
INFORME DE CUMPLIMIENTO DE METAS - CdD 3.1: RACIONALIZACIÓN Y VALIDACIÓN DE PLAZAS

Para: Dirección de la UGEL Bellavista
De: Área de Gestión Institucional (AGI) - Racionalización
Asunto: Consolidado final y resultados obtenidos del Compromiso de Desempeño 3.1

ANTECEDENTES:
1. Mediante la Resolución Ministerial N° 015-2026-MINEDU se aprobaron las Normas para la Implementación de los Compromisos de Desempeño (CdD) para el año 2026.
2. El Compromiso de Desempeño 3.1 exige el "Registro oportuno y validación del 100% de plazas docentes y administrativas vacantes en el sistema NEXUS" y la ejecución del proceso de racionalización.

RESULTADOS OBTENIDOS (EVALUACIÓN DE METAS DE RACIONALIZACIÓN):
- Meta Física Establecida por MINEDU: Validación de 145 plazas de personal docente y administrativo en Instituciones Educativas de la UGEL Bellavista.
- Meta Física Alcanzada por UGEL Bellavista: 145 plazas procesadas, validadas y cargadas exitosamente en el aplicativo NEXUS.
- Porcentaje de Cumplimiento: 100.00% (Logro Histórico Destacado en Racionalización).

CONCLUSIONES:
1. Se ha logrado el cumplimiento absoluto y oportuno de la meta del Compromiso de Desempeño 3.1 (CdD 3.1) en racionalización de plazas para el periodo 2026.
2. Las 145 plazas validadas en NEXUS se encuentran completamente aptas, liberadas y debidamente saneadas para el normal desarrollo de los procesos de contratación y reasignación docente de la provincia.
3. Se requiere elevar este informe a Dirección para su toma de conocimiento oficial sobre el cumplimiento total del hito de racionalización.

RECOMENDACIONES:
1. Disponer que el Equipo de Personal tome como insumo oficial este consolidado para la emisión oportuna de contratos docentes y administrativos en el sistema NEXUS.
2. Emitir la Resolución Directoral (RD) correspondiente que apruebe formalmente el cuadro consolidado del proceso de racionalización docente 2026 de la UGEL Bellavista.`
  }
];

export default function UploadView({ currentUser, onDocumentAdded }: UploadViewProps) {
  // Document state matching the left fields
  const [docType, setDocType] = useState<string>('Informe Técnico');
  const [customDocType, setCustomDocType] = useState<string>('');
  const [docNumber, setDocNumber] = useState<string>('0001');
  const [docSuffix, setDocSuffix] = useState<string>('-2026-UGEL-AGI');
  const [recipients, setRecipients] = useState<{ id: string; nombre: string; cargo: string }[]>([
    { id: '1', nombre: '', cargo: '' }
  ]);
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);

  const [asunto, setAsunto] = useState<string>('');
  const [referencia, setReferencia] = useState<string>('');
  const [contextoNotas, setContextoNotas] = useState<string>('');



  const setDestinatario = (value: string) => {
    setRecipients(prev => {
      const updated = [...prev];
      if (updated[0]) {
        updated[0] = { ...updated[0], nombre: value };
      }
      return updated;
    });
  };

  const setCargoDestinatario = (value: string) => {
    setRecipients(prev => {
      const updated = [...prev];
      if (updated[0]) {
        updated[0] = { ...updated[0], cargo: value };
      }
      return updated;
    });
  };

  // Add refs to prevent stale closure during async operations (like OCR)
  const recipientsRef = useRef(recipients);
  useEffect(() => {
    recipientsRef.current = recipients;
  }, [recipients]);

  const asuntoRef = useRef(asunto);
  useEffect(() => {
    asuntoRef.current = asunto;
  }, [asunto]);

  const referenciaRef = useRef(referencia);
  useEffect(() => {
    referenciaRef.current = referencia;
  }, [referencia]);

  const handleAddRecipient = () => {
    setRecipients(prev => [
      ...prev,
      { id: (Date.now() + Math.random()).toString(), nombre: '', cargo: '' }
    ]);
  };

  const handleRemoveRecipient = (index: number) => {
    if (recipients.length <= 1) return;
    setRecipients(prev => prev.filter((_, i) => i !== index));
  };

  const handleRecipientChange = (index: number, field: 'nombre' | 'cargo', value: string) => {
    setRecipients(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  // Area state overrides & directory autocomplete
  const [savedHeaderImage, setSavedHeaderImage] = useState<string | null>(null);
  const [savedUserName, setSavedUserName] = useState<string>('');
  const [savedUserRole, setSavedUserRole] = useState<string>('');
  const [savedRecipients, setSavedRecipients] = useState<{ id: string; nombre: string; cargo: string; sexo?: 'F' | 'M' }[]>([]);

  // Saludo del documento según el sexo del destinatario: F -> "A LA", si no -> "AL".
  const getSalutation = (name?: string): string => {
    if (!name) return 'AL';
    const match = savedRecipients.find(r => r.nombre.trim().toUpperCase() === name.trim().toUpperCase());
    return match?.sexo === 'F' ? 'A LA' : 'AL';
  };
  const [showDestinatarioDropdown, setShowDestinatarioDropdown] = useState(false);

  // Load and reactively update configurations from localStorage
  useEffect(() => {
    setSavedHeaderImage(safeStorage.getItem('saved_area_header_image'));
    setSavedUserName(safeStorage.getItem('saved_user_name') || currentUser.name);
    setSavedUserRole(safeStorage.getItem('saved_user_role') || currentUser.role);
    
    const suffix = safeStorage.getItem('saved_area_suffix');
    if (suffix) {
      setDocSuffix(suffix);
    }

    const RECIPIENTS_VERSION = 'ugel-2026-v1';
    const recs = safeStorage.getItem('saved_destinatarios_list');
    if (recs && safeStorage.getItem('saved_destinatarios_version') === RECIPIENTS_VERSION) {
      setSavedRecipients(JSON.parse(recs));
    } else {
      safeStorage.setItem('saved_destinatarios_list', JSON.stringify(DEFAULT_RECIPIENTS));
      safeStorage.setItem('saved_destinatarios_version', RECIPIENTS_VERSION);
      setSavedRecipients(DEFAULT_RECIPIENTS);
    }
  }, [currentUser]);

  // Processing & Multi-Provider status states
  const [loadingOcr, setLoadingOcr] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Expanded Document Types and Area Hierarchy
  const ALL_DOC_TYPES: DocumentType[] = [
    'Informe',
    'Oficio',
    'Memorando',
    'Carta',
    'Proveído',
    'Resolución',
    'Acta',
    'Constancia',
    'Informe Técnico',
    'Solicitud',
    'Dictamen',
    'Directiva',
    'Circular',
    'Oficio Múltiple',
    'Memorando Múltiple',
    'Nota de Insumo',
    'Nota de Coordinación',
    'Otros'
  ];

  const [areasList, setAreasList] = useState<any[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('adm');
  const [subtipoProposito, setSubtipoProposito] = useState<string>('Certificación Presupuestal');
  const [templateMatch, setTemplateMatch] = useState<{ found: boolean; matchLevel: string; matchedAreaName?: string; template?: any } | null>(null);

  // Fetch areas on mount
  useEffect(() => {
    fetch('/api/areas')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setAreasList(data);
      })
      .catch(() => {});
  }, []);

  const [remitenteNombre, setRemitenteNombre] = useState<string>('');
  const [remitenteCargo, setRemitenteCargo] = useState<string>('');

  // Computed values for backward compatibility
  const activeDocTypeLabel = docType === 'Otros' ? (customDocType.trim() || 'Otros') : docType;
  const selectedAreaObj = areasList.find(a => a.id === selectedAreaId);
  const currentHeaderImage = selectedAreaObj?.membreteBase64 || safeStorage.getItem('saved_area_header_image') || savedHeaderImage;
  const destinatario = recipients[0]?.nombre || '';
  const cargoDestinatario = recipients[0]?.cargo || '';

  // Default selectedAreaId to user's area on load
  useEffect(() => {
    if (currentUser && currentUser.areaId) {
      setSelectedAreaId(currentUser.areaId);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    
    // El DE (remitente) se vincula automáticamente al usuario que inició sesión
    // (su nombre y su cargo), al seleccionar un área. Si el área tiene un
    // responsable configurado explícitamente, se respeta esa configuración.
    const selectedAreaObj = areasList.find(a => a.id === selectedAreaId);
    if (selectedAreaObj && selectedAreaObj.responsableNombre) {
      setRemitenteNombre(selectedAreaObj.responsableNombre);
      setRemitenteCargo(selectedAreaObj.responsableCargo || '');
    } else {
      setRemitenteNombre(currentUser.name);
      setRemitenteCargo(currentUser.cargo || currentUser.role);
    }
  }, [selectedAreaId, currentUser, areasList]);

  // Fetch correlative number when area or docType changes
  useEffect(() => {
    if (!selectedAreaId || !docType) return;
    fetch(`/api/correlativo?areaId=${selectedAreaId}&docType=${encodeURIComponent(docType)}`)
      .then(r => r.json())
      .then(data => {
        if (data.rawNumber) setDocNumber(data.rawNumber);
        if (data.suffix) setDocSuffix(data.suffix);
      })
      .catch(() => {});
  }, [selectedAreaId, docType]);

  // Check template match and fallback hierarchy
  useEffect(() => {
    if (!selectedAreaId || !docType) return;
    fetch(`/api/area-templates/check?areaId=${selectedAreaId}&docType=${encodeURIComponent(docType)}&subtipo=${encodeURIComponent(subtipoProposito)}`)
      .then(r => r.json())
      .then(data => {
        setTemplateMatch(data);
      })
      .catch(() => {});
  }, [selectedAreaId, docType, subtipoProposito]);

  // IA Pipeline logs
  const [ocrLog, setOcrLog] = useState<{ attempted: string[]; iaUtilizada: string; responseTimeMs: number } | null>(null);
  const [draftLog, setDraftLog] = useState<{ attempted: string[]; iaUtilizada: string; responseTimeMs: number } | null>(null);

  // Machine Learning & Page Optimization states
  const [originalOcrValues, setOriginalOcrValues] = useState<{ referencia: string; solicitante: string; tema: string; area_responsable: string; urgencia: string } | null>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editedDraftValue, setEditedDraftValue] = useState('');
  const [ocrOptimizationInfo, setOcrOptimizationInfo] = useState<{ isOptimized: boolean; originalPageCount: number } | null>(null);

  const [generatedDraft, setGeneratedDraft] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [referenceFileText, setReferenceFileText] = useState<string>('');
  const [uploadedFileBase64, setUploadedFileBase64] = useState<string>('');
  const [uploadedFileMimeType, setUploadedFileMimeType] = useState<string>('');
  const [referenceOcrMetadata, setReferenceOcrMetadata] = useState<any>(null);
  const [showSamplesList, setShowSamplesList] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Native alert alternative state
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const triggerAlert = (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setAlertState({ isOpen: true, title, message, type });
  };

  // Administrative Error Detector State Variables
  const [errorReport, setErrorReport] = useState<{ id: string; gravedad: string; seccion: string; descripcion: string; sugerencia: string; targetText?: string; replacementText?: string }[]>([]);
  const [auditingErrors, setAuditingErrors] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const runAdministrativeAudit = async (textToAudit: string) => {
    if (!textToAudit) return;
    setAuditingErrors(true);
    try {
      const response = await fetch('/api/ai/detect-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftText: textToAudit,
          docType,
          expediente: referenceOcrMetadata?.expediente || '',
          referencia: referencia,
          asunto: asunto,
          destinatario: destinatario,
          cargoDestinatario: cargoDestinatario,
          usuario: currentUser.name
        })
      });
      if (response.ok) {
        const data = await response.json();
        setErrorReport(data.errors || []);
      } else {
        const errData = await response.json();
        console.error('Audit Error:', errData.error);
      }
    } catch (e: any) {
      console.error('Error contacting audit service:', e);
    } finally {
      setAuditingErrors(false);
    }
  };

  // Dynamic document tag preview builder
  const getFullDocCode = () => {
    const num = docNumber.trim() || '-----';
    const suffix = docSuffix.trim() || '-2026-UGEL-AGI';
    return `N° ${num}${suffix}`;
  };

  // Clean backslash-n strings and duplicate header keys from AI draft body
  const cleanDocumentText = (text: string) => {
    if (!text) return '';
    
    // 1. Replace literal backslash-n sequences like '\\n' or '\\n\\n' with actual newlines.
    let cleaned = text.replace(/\\n/g, '\n');
    
    // 2. Strip code blocks if present
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n/gm, '').replace(/\n```$/gm, '');

    // 3. Strip duplicate headers: if the model generated a header block
    const lines = cleaned.split('\n');
    const bodyLines: string[] = [];
    let foundMainBodyStart = false;

    for (let line of lines) {
      const trimmed = line.trim();
      
      if (!foundMainBodyStart) {
        const isHeaderKey = 
          trimmed.toUpperCase().startsWith('MEMORANDO') ||
          trimmed.toUpperCase().startsWith('INFORME N') ||
          trimmed.toUpperCase().startsWith('INFORME_N') ||
          trimmed.toUpperCase().startsWith('OFICIO') ||
          trimmed.toUpperCase().startsWith('PARA:') ||
          trimmed.toUpperCase().startsWith('AL:') ||
          trimmed.toUpperCase().startsWith('DE:') ||
          trimmed.toUpperCase().startsWith('ASUNTO:') ||
          trimmed.toUpperCase().startsWith('REF:') ||
          trimmed.toUpperCase().startsWith('REFERENCIA:') ||
          trimmed.toUpperCase().startsWith('FECHA:') ||
          trimmed.toUpperCase().startsWith('LUGAR Y FECHA:') ||
          trimmed.toUpperCase().startsWith('AÑO DE') ||
          trimmed.toUpperCase().startsWith('"AÑO DE');

        if (isHeaderKey) {
          continue; // skip this line!
        }
        
        if (trimmed.length > 0) {
          foundMainBodyStart = true;
        } else {
          continue; // skip leading empty lines
        }
      }
      
      bodyLines.push(line);
    }

    return bodyLines.join('\n').trim();
  };

  // Directory saved feedback
  const handleSaveToDirectory = () => {
    if (!destinatario.trim()) {
      triggerAlert('Campo Faltante', 'Por favor ingrese un nombre de destinatario primero.', 'warning');
      return;
    }
    
    // Check if already exists
    const exists = savedRecipients.some(r => r.nombre.toUpperCase() === destinatario.trim().toUpperCase());
    if (exists) {
      triggerAlert('Destinatario Existente', `El destinatario "${destinatario.toUpperCase()}" ya está registrado en el directorio.`, 'warning');
      return;
    }

    const newRec = {
      id: `rec-${Date.now()}`,
      nombre: destinatario.trim().toUpperCase(),
      cargo: (cargoDestinatario || 'SIN CARGO').trim().toUpperCase()
    };

    const updated = [...savedRecipients, newRec];
    setSavedRecipients(updated);
    safeStorage.setItem('saved_destinatarios_list', JSON.stringify(updated));
    triggerAlert('Directorio Actualizado', `El destinatario "${newRec.nombre}" con cargo "${newRec.cargo}" ha sido registrado con éxito en su directorio institucional.`, 'success');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFileName(file.name);
      setUploadedFileMimeType(file.type || 'application/octet-stream');

      if (file.size > 2 * 1024 * 1024) {
        triggerAlert('Documento Extenso Detectado', 'El archivo seleccionado es grande. El sistema aplicará compresión de contexto y resumen inteligente para optimizar el consumo de tokens.', 'info');
      }
      
      const reader = new FileReader();
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        reader.onload = (event) => {
          const base64String = event.target?.result as string;
          setUploadedFileBase64(base64String);
          // For PDFs, we don't have text content in frontend, we send a placeholder, and let backend parse the base64 PDF
          setReferenceFileText('[Documento PDF Adjunto - Analizado con IA Multimodal]');
          triggerOcrPipeline('[Documento PDF Adjunto - Analizado con IA Multimodal]', file.name, base64String, 'application/pdf');
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event) => {
          const textContent = event.target?.result as string;
          setReferenceFileText(textContent.slice(0, 5000));
          setUploadedFileBase64('');
          triggerOcrPipeline(textContent.slice(0, 5000), file.name);
        };
        reader.readAsText(file);
      }
    }
  };

  // Load sample demo document
  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_DOCS.find(s => s.id === sampleId);
    if (sample) {
      setUploadedFileName(sample.label.split(' (')[0]);
      setReferenceFileText(sample.text);
      setShowSamplesList(false);

      if (sampleId === 'sample-3') {
        setDocType('Memorando');
        setDocNumber('0045');
        setDestinatario('DIRECCIÓN DE LA UGEL BELLAVISTA');
        setCargoDestinatario('DIRECTOR DE LA UGEL BELLAVISTA');
        setAsunto('DANDO A CONOCER RESULTADOS DEL COMPROMISO DE DESEMPEÑO (CdD 3.1)');
        setReferencia('OFICIO MULTIPLE N° 012-2026-MINEDU');
        setContextoNotas('Se remite el consolidado final del cumplimiento del Compromiso de Desempeño 3.1 (CdD 3.1) sobre racionalización de plazas. Según el informe adjunto, logramos el 100% de la meta física (145 plazas docentes validadas exitosamente en el aplicativo NEXUS). Se solicita que la Dirección tome conocimiento de los resultados y disponga que el Equipo de Personal proceda de acuerdo a las conclusiones y recomendaciones del informe de racionalización adjunto.');
      } else if (sampleId === 'sample-1') {
        setDocType('Informe Técnico');
        setDocNumber('0012');
        setDestinatario('ING. CARLOS MENDOZA');
        setCargoDestinatario('JEFE DE INFRAESTRUCTURA');
        setAsunto('EVALUACIÓN DE INFRAESTRUCTURA PABELLÓN B - I.E. N° 1024');
        setReferencia('SOLICITUD DE APAFA N° 004-2026');
        setContextoNotas('Se adjunta solicitud de APAFA sobre rajaduras y filtraciones graves en el pabellón B. Se solicita realizar la inspección técnica urgente en el local escolar para la respectiva autorización presupuestal.');
      } else if (sampleId === 'sample-2') {
        setDocType('Oficio');
        setDocNumber('0028');
        setDestinatario('SOFÍA CASTRO');
        setCargoDestinatario('ADMINISTRADOR');
        setAsunto('ADQUISICIÓN DE EQUIPOS TECNOLÓGICOS CON PARTIDA N° 4022');
        setReferencia('MEMORANDO N° 088-2026-DGA');
        setContextoNotas('Se solicita iniciar las cotizaciones para la adquisición de 15 computadoras de escritorio según las especificaciones técnicas del memo adjunto.');
      }

      // Automatically run intelligent OCR Multi-provider extraction
      triggerOcrPipeline(sample.text, sample.label);
    }
  };

  // Step 1: Run Multi-Provider OCR on Text to fill fields
  const triggerOcrPipeline = async (text: string, filename: string, fileBase64?: string, mimeType?: string) => {
    setLoadingOcr(true);
    setOcrLog(null);
    setOcrOptimizationInfo(null);

    try {
      const response = await fetch('/api/ai/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          filename: filename,
          usuario: currentUser.name,
          fileBase64: fileBase64 || uploadedFileBase64 || undefined,
          mimeType: mimeType || uploadedFileMimeType || undefined
        })
      });

      let result;
      try {
        result = await response.json();
      } catch (pErr) {
        throw new Error(`La respuesta del servidor no es un JSON válido (HTTP ${response.status}).`);
      }
      if (!response.ok) throw new Error(result.error || 'Error de procesamiento en el servidor.');

      if (result.data) {
        setReferenceOcrMetadata(result.data);
        
        const keptFields: string[] = [];
        
        // Auto-populate visible form fields for review and human correction only if they are currently empty
        if (result.data.referencia) {
          if (!referenciaRef.current.trim()) {
            setReferencia(result.data.referencia);
          } else {
            keptFields.push('Referencia');
          }
        }
        
        if (result.data.solicitante) {
          const firstRecName = recipientsRef.current[0]?.nombre || '';
          if (!firstRecName.trim()) {
            setDestinatario(result.data.solicitante);
          } else {
            keptFields.push('Destinatario');
          }
        }
        
        if (result.data.tema) {
          if (!asuntoRef.current.trim()) {
            setAsunto(result.data.tema);
          } else {
            keptFields.push('Asunto');
          }
        }
        
        if (result.data.datos_extraidos?.cargo_destinatario) {
          const firstRecCargo = recipientsRef.current[0]?.cargo || '';
          if (!firstRecCargo.trim()) {
            setCargoDestinatario(result.data.datos_extraidos.cargo_destinatario);
          } else {
            keptFields.push('Cargo del Destinatario');
          }
        }
        
        if (keptFields.length > 0) {
          triggerAlert('Valores Conservados', `Se conservaron sus datos ingresados manualmente para: ${keptFields.join(', ')}.`, 'info');
        }
        
        // Save the raw, unaltered values extracted by the IA for comparison
        setOriginalOcrValues({
          referencia: result.data.referencia || '',
          solicitante: result.data.solicitante || '',
          tema: result.data.tema || '',
          area_responsable: result.data.datos_extraidos?.area_responsable || 'Racionalización / Gestión Institucional',
          urgencia: result.data.datos_extraidos?.urgencia || 'Alta'
        });
      }

      if (result.isOptimized) {
        setOcrOptimizationInfo({
          isOptimized: true,
          originalPageCount: result.originalPageCount
        });
      }

      setOcrLog({
        attempted: result.attempted,
        iaUtilizada: result.ia_utilizada,
        responseTimeMs: result.responseTimeMs
      });
    } catch (err: any) {
      triggerAlert('Error en OCR', `Error en extracción OCR de IA: ${err.message}`, 'error');
    } finally {
      setLoadingOcr(false);
    }
  };

  // Step 2: Draft official document based on form parameters
  const triggerDraftGeneration = async () => {
    setLoadingDraft(true);
    setGeneratedDraft('');
    setEditedDraftValue('');
    setIsEditingDraft(false);
    setSavedSuccess(false);

    // Build metadata payload
    const metadata = {
      expediente: getFullDocCode(),
      referencia: referencia || 'Sin Referencia',
      solicitante: destinatario || 'No especificado',
      tema: asunto || 'Sin Asunto',
      datos_extraidos: {
        cargo_destinatario: cargoDestinatario,
        notas_adicionales: contextoNotas,
        numero: docNumber,
        sufijo: docSuffix,
        remitente_nombre: remitenteNombre,
        remitente_cargo: remitenteCargo,
        // Send the internally saved OCR reference metadata to the AI as context
        referencia_interna: referenceOcrMetadata
      }
    };

    // Combine any uploaded reference text and user's manual notes
    let combinedOriginalText = '';
    if (referenceFileText) {
      combinedOriginalText += `[DOCUMENTO DE REFERENCIA SUBIDO INTERNAMENTE]:\n${referenceFileText}\n\n`;
    }
    if (referenceOcrMetadata) {
      combinedOriginalText += `[METADATOS EXTRAÍDOS INTERNAMENTE DEL DOCUMENTO DE REFERENCIA]:\n`;
      if (referenceOcrMetadata.referencia) {
        combinedOriginalText += `Código Referencia: ${referenceOcrMetadata.referencia}\n`;
      }
      if (referenceOcrMetadata.tema) {
        combinedOriginalText += `Tema original: ${referenceOcrMetadata.tema}\n`;
      }
      if (referenceOcrMetadata.solicitante) {
        combinedOriginalText += `Solicitante original: ${referenceOcrMetadata.solicitante}\n`;
      }
      if (referenceOcrMetadata.datos_extraidos) {
        combinedOriginalText += `Otros metadatos: ${JSON.stringify(referenceOcrMetadata.datos_extraidos)}\n`;
      }
      combinedOriginalText += `\n`;
    }
    if (contextoNotas) {
      combinedOriginalText += `[NOTAS DE CONTEXTO ADICIONALES DEL USUARIO]:\n${contextoNotas}`;
    }

    try {
      const response = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: metadata,
          docType: activeDocTypeLabel,
          originalText: combinedOriginalText || undefined,
          usuario: currentUser.name,
          fileBase64: uploadedFileBase64 || undefined,
          mimeType: uploadedFileMimeType || undefined
        })
      });

      let result;
      try {
        result = await response.json();
      } catch (pErr) {
        throw new Error(`La respuesta de redacción del servidor no es un JSON válido (HTTP ${response.status}).`);
      }
      if (!response.ok) throw new Error(result.error || 'Error de redacción en el servidor.');

      setGeneratedDraft(result.data?.texto_redactado || '');
      setEditedDraftValue(result.data.texto_redactado || '');
      
      if (result.data.texto_redactado) {
        runAdministrativeAudit(result.data.texto_redactado);
      }
      
      setDraftLog({
        attempted: result.attempted,
        iaUtilizada: result.ia_utilizada,
        responseTimeMs: result.responseTimeMs
      });
    } catch (err: any) {
      triggerAlert('Error de Redacción', `Error de Redacción IA: ${err.message}`, 'error');
    } finally {
      setLoadingDraft(false);
    }
  };

  // Human Correction & active ML feedback loop
  const handleSaveLearning = async () => {
    if (!originalOcrValues) return;
    
    const correctionsToSave = [];
    
    if (referencia !== originalOcrValues.referencia) {
      correctionsToSave.push({
        campo: 'Código de Referencia',
        valorErroneo: originalOcrValues.referencia,
        valorCorregido: referencia,
        explicacion: 'El usuario corrigió el identificador/referencia oficial extraído por la IA.'
      });
    }
    
    if (destinatario !== originalOcrValues.solicitante) {
      correctionsToSave.push({
        campo: 'Remitente / Solicitante',
        valorErroneo: originalOcrValues.solicitante,
        valorCorregido: destinatario,
        explicacion: 'El usuario corrigió el remitente o firmante del documento.'
      });
    }
    
    if (asunto !== originalOcrValues.tema) {
      correctionsToSave.push({
        campo: 'Asunto / Tema del Expediente',
        valorErroneo: originalOcrValues.tema,
        valorCorregido: asunto,
        explicacion: 'El usuario corrigió la temática o clasificación del documento original.'
      });
    }

    if (correctionsToSave.length === 0) {
      triggerAlert('Sin Correcciones', 'La información actual coincide con lo extraído por la IA. ¡No se detectaron errores que corregir!', 'info');
      return;
    }

    try {
      for (const corr of correctionsToSave) {
        await fetch('/api/learning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campo: corr.campo,
            valorErroneo: corr.valorErroneo,
            valorCorregido: corr.valorCorregido,
            contextoTexto: referenceFileText ? referenceFileText.slice(0, 800) : 'Extracción desde el formulario de la UGEL',
            explicacion: corr.explicacion,
            usuario: currentUser.name
          })
        });
      }
      
      // Update local baseline
      setOriginalOcrValues({
        referencia: referencia,
        solicitante: destinatario,
        tema: asunto,
        area_responsable: originalOcrValues.area_responsable,
        urgencia: originalOcrValues.urgencia
      });
      
      triggerAlert('Aprendizaje Registrado', '¡Enhorabuena! Sistema de aprendizaje activo UGEL actualizado. La IA ha procesado tu corrección como una lección prioritaria para futuros expedientes.', 'success');
    } catch (e: any) {
      triggerAlert('Error de Aprendizaje', `Error al registrar el aprendizaje: ${e.message}`, 'error');
    }
  };

  // Step 3: Save generated draft to system database archive
  const handleSaveDocument = async () => {
    if (!generatedDraft) return;
    setSaving(true);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expediente: getFullDocCode(),
          referencia: referencia || 'S/R',
          solicitante: recipients.map(r => r.nombre).filter(Boolean).join(', ') || 'Anónimo',
          tema: asunto || 'Sin tema especificado',
          tipo: activeDocTypeLabel,
          datosExtraidos: {
            cargo_destinatario: cargoDestinatario,
            destinatarios: recipients,
            notas_del_contexto: contextoNotas,
            proveedor_ia: draftLog?.iaUtilizada || 'Multi-Provider IA'
          },
          textoRedactado: generatedDraft,
          iaUtilizada: draftLog?.iaUtilizada || 'Multi-Provider IA',
          tokens: 420,
          originalFilename: uploadedFileName,
          textoOriginal: referenceFileText,
          creadoPor: currentUser.name
        })
      });

      if (!response.ok) throw new Error('Error al registrar el documento oficial.');
      
      setSavedSuccess(true);
      onDocumentAdded(); // Refresh list in App
    } catch (err: any) {
      triggerAlert('Error al Registrar', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Export engines for active document draft preview
  const exportToWord = () => {
    const cleanText = cleanDocumentText(generatedDraft);
    const latestHeaderImage = null; // Avoid large Base64 images in Word HTML to prevent MS Word crashes
    // El DE del documento exportado se vincula al remitente (usuario logueado + su cargo)
    const latestUserName = remitenteNombre || safeStorage.getItem('saved_user_name') || currentUser.name;
    const latestUserRole = remitenteCargo || safeStorage.getItem('saved_user_role') || currentUser.cargo || currentUser.role;

    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Documento Oficial</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page Section1 {
            size: 8.5in 11.0in;
            margin: 1.0in 1.0in 1.0in 1.0in;
            mso-header-margin: 0.5in;
            mso-footer-margin: 0.5in;
            mso-header: h1;
          }
          div.Section1 {
            page: Section1;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11pt;
            color: #000000;
          }
          p {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11pt;
            line-height: 1.15;
            margin-top: 0;
            margin-bottom: 11pt;
            text-align: justify;
            color: #000000;
          }
          p.MsoHeader, div.MsoHeader {
            margin: 0in;
            margin-bottom: .0001pt;
          }
        </style>
      </head>
      <body>
    `;
    
    let headerBlock = '';
    if (latestHeaderImage) {
      headerBlock = `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <tr>
            <td style="text-align: center; padding-bottom: 15px;">
              <img src="${latestHeaderImage}" width="600" style="width: 600px; height: auto; display: block; margin: 0 auto;" />
            </td>
          </tr>
        </table>
      `;
    } else {
      headerBlock = `
        <table style="width: 100%; border-collapse: collapse; padding-bottom: 12px; margin-bottom: 20px;">
          <tr>
            <td style="width: 30%; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.2; vertical-align: middle;">
              <strong style="color: #1d4ed8; font-style: italic; font-size: 14px;">San Martín</strong><br/>
              <span style="font-weight: bold; text-transform: uppercase; font-size: 9px; color: #666;">Gobierno Regional</span>
            </td>
            <td style="width: 70%; bg-color: #8B3A3A; background-color: #8B3A3A; color: white; text-align: center; padding: 10px; font-family: Arial, sans-serif; font-weight: bold; vertical-align: middle;">
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">DIRECCIÓN REGIONAL DE EDUCACIÓN</div>
              <div style="font-size: 9px; text-transform: uppercase; font-weight: normal; margin-top: 3px;">UGEL Bellavista – Dirección – Área de Gestión Institucional – Racionalización</div>
              <div style="font-size: 7px; font-style: italic; font-weight: normal; margin-top: 4px; opacity: 0.9;">"AÑO DEL BICENTENARIO, DE LA CONSOLIDACIÓN DE NUESTRA INDEPENDENCIA, Y DE LA CONMEMORACIÓN DE LAS HEROICAS BATALLAS DE JUNÍN Y AYACUCHO"</div>
            </td>
          </tr>
        </table>
      `;
    }

    const formattedParagraphs = cleanText
      ? cleanText
          .split(/\n\s*\n/)
          .map(para => {
            const cleanPara = para.trim();
            if (!cleanPara) return '';
            return `<p style="margin-top: 0; margin-bottom: 11pt; line-height: 1.15; text-align: justify; font-family: Arial, sans-serif; font-size: 11pt; color: #000000;">${cleanPara.replace(/\n/g, '<br/>')}</p>`;
          })
          .filter(Boolean)
          .join('')
      : '<p style="margin-top: 0; margin-bottom: 11pt; line-height: 1.15; font-family: Arial, sans-serif; font-size: 11pt; color: #000000;">◇ la IA redactará el cuerpo aquí</p>';

    const isCarta = activeDocTypeLabel.toLowerCase() === 'carta';

    let body = '';

    if (isCarta) {
      // Precise Carta 2026 Layout matching the analyzed .docx structure:
      // Date Right Aligned -> Code Left Aligned -> SEÑOR Block -> ASUNTO -> REF (if exists) -> Dotted line -> Justified body -> Centered Atentamente -> Left aligned pie
      body = `
        <div class="Section1" style="font-family: Arial, sans-serif;">
          <!-- Native Word Header element -->
          <div style="mso-element:header" id="h1">
            <div class="MsoHeader">
              ${headerBlock}
            </div>
          </div>

          <div style="text-align: right; font-size: 11pt; margin-bottom: 20px; font-family: Arial, sans-serif;">
            Bellavista, ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </div>

          <div style="text-align: left; font-weight: bold; font-size: 11pt; margin-bottom: 15px; font-family: Arial, sans-serif;">
            ${activeDocTypeLabel.toUpperCase()} N° ${docNumber}${docSuffix.trim()}
          </div>

          <div style="text-align: left; font-size: 11pt; margin-bottom: 15px; font-family: Arial, sans-serif; line-height: 1.3;">
            <strong style="text-transform: uppercase;">SEÑOR&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${recipients[0]?.nombre || '-----'}</strong>
            ${recipients[0]?.cargo ? `<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="font-size: 10pt; text-transform: uppercase; font-weight: bold; color: #334155;">${recipients[0].cargo}</span>` : ''}
            <br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong style="text-transform: uppercase;">BELLAVISTA.-</strong>
          </div>

          <div style="text-align: left; font-size: 11pt; margin-bottom: 10px; font-family: Arial, sans-serif; line-height: 1.3;">
            <strong>ASUNTO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="text-transform: uppercase;">${asunto || '-----'}</span></strong>
          </div>

          ${referencia ? `
          <div style="text-align: left; font-size: 11pt; margin-bottom: 15px; font-family: Arial, sans-serif; line-height: 1.3;">
            <strong>REF. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style="text-transform: uppercase;">${referencia}</span></strong>
          </div>
          ` : ''}

          <div style="text-align: center; margin-bottom: 20px; font-family: Arial, sans-serif; letter-spacing: -1px; color: #777777;">
            ------------------------------------------------------------------------------------------------------------------------
          </div>

          <div style="font-size: 11pt; text-align: justify; line-height: 1.15; font-family: Arial, sans-serif; color: #000000;">
            ${formattedParagraphs}
          </div>

          <!-- Center-aligned "Atentamente" signature area -->
          <br/><br/>
          <table style="width: 100%; border-collapse: collapse; margin-top: 40px; font-family: Arial, sans-serif; font-size: 11pt; text-align: center;">
            <tr>
              <td style="text-align: center; width: 100%;">
                <span style="font-weight: bold; display: block; margin-bottom: 85px;">Atentamente,</span>
              </td>
            </tr>
          </table>
        </div>
      `;
    } else {
      body = `
        <div class="Section1">
          <!-- Native Word Header element -->
          <div style="mso-element:header" id="h1">
            <div class="MsoHeader">
              ${headerBlock}
            </div>
          </div>

          <h2 style="text-align: center; text-decoration: underline; margin-bottom: 25px; font-size: 13pt; font-family: Arial, sans-serif; font-weight: bold; text-transform: uppercase;">
            ${activeDocTypeLabel.toUpperCase()} ${getFullDocCode()}
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11pt; font-family: Arial, sans-serif; line-height: 1.15;">
            <tr>
              <td style="width: 140px; font-weight: bold; padding: 6px 0; vertical-align: top;">${getSalutation(recipients[0]?.nombre)}</td>
              <td style="width: 15px; font-weight: bold; padding: 6px 0; vertical-align: top;">:</td>
              <td style="padding: 6px 0; vertical-align: top;">
                ${recipients.map((dest, idx) => `
                  ${idx > 0 ? '<div style="margin-top: 10px;"></div>' : ''}
                  <strong style="text-transform: uppercase; font-size: 11pt;">${dest.nombre || '-----'}</strong>
                  ${dest.cargo ? `<br/><span style="font-size: 10pt; color: #334155; text-transform: uppercase; font-weight: bold;">${dest.cargo}</span>` : ''}
                `).join('')}
              </td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding: 6px 0; vertical-align: top;">DE</td>
              <td style="font-weight: bold; padding: 6px 0; vertical-align: top;">:</td>
              <td style="padding: 6px 0; vertical-align: top;">
                <strong style="text-transform: uppercase; font-size: 11pt;">${latestUserName}</strong>
                <br/><span style="font-size: 10pt; color: #334155; text-transform: uppercase; font-weight: bold;">${latestUserRole}</span>
              </td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding: 6px 0; vertical-align: top;">ASUNTO</td>
              <td style="font-weight: bold; padding: 6px 0; vertical-align: top;">:</td>
              <td style="padding: 6px 0; vertical-align: top; font-weight: bold; text-transform: uppercase;">${asunto}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding: 6px 0; vertical-align: top;">REFERENCIA</td>
              <td style="font-weight: bold; padding: 6px 0; vertical-align: top;">:</td>
              <td style="padding: 6px 0; vertical-align: top; color: #1e293b;">${referencia || 'SIN REFERENCIA'}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding: 6px 0; vertical-align: top;">LUGAR Y FECHA</td>
              <td style="font-weight: bold; padding: 6px 0; vertical-align: top;">:</td>
              <td style="padding: 6px 0; vertical-align: top; color: #1e293b;">Bellavista, ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            </tr>
          </table>
          <hr style="border: 0; border-top: 1px dashed #777777; margin-bottom: 25px;" />
          <div style="font-size: 11pt; text-align: justify; line-height: 1.15; font-family: Arial, sans-serif; color: #000000; padding-top: 5px;">
            ${formattedParagraphs}
          </div>

          <!-- Center-aligned "Atentamente" signature area -->
          <br/><br/>
          <table style="width: 100%; border-collapse: collapse; margin-top: 40px; font-family: Arial, sans-serif; font-size: 11pt; text-align: center;">
            <tr>
              <td style="text-align: center; width: 100%;">
                <span style="font-weight: bold; display: block; margin-bottom: 60px;">Atentamente,</span>
              </td>
            </tr>
          </table>
        </div>
      `;
    }
    
    const bodyEnd = `</body></html>`;
    const finalBody = body + bodyEnd;
    
    const filename = `${getFullDocCode().replace(/\s+/g, '_')}_Draft.doc`;
    const blob = new Blob(['\uFEFF' + header + finalBody], { type: 'application/msword' });
    saveDocument(filename, blob, 'application/msword');
  };

  const handlePrint = () => {
    const cleanText = cleanDocumentText(generatedDraft);
    const latestHeaderImage = currentHeaderImage;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${activeDocTypeLabel} ${getFullDocCode()}</title>
            <style>
              body { font-family: 'Times New Roman', Georgia, serif; padding: 40px; color: #1e293b; line-height: 1.6; }
              .header-container { display: flex; align-items: center; border-bottom: 2px solid #8B3A3A; padding-bottom: 15px; margin-bottom: 25px; }
              .logo-side { display: flex; align-items: center; width: 30%; gap: 8px; font-family: Arial, Helvetica, sans-serif; }
              .logo-badge { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #d97706; background-color: #fef3c7; display: flex; align-items: center; justify-content: center; font-size: 10px; }
              .logo-text { font-size: 10px; line-height: 1.1; color: #334155; }
              .logo-brand { font-size: 12px; font-weight: bold; color: #4338ca; font-style: italic; }
              .banner-side { flex-1: 1; background-color: #8B3A3A; color: white; padding: 8px; text-align: center; font-family: Arial, Helvetica, sans-serif; border-radius: 4px; width: 70%; }
              .banner-main { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
              .banner-sub { font-size: 8px; font-weight: bold; text-transform: uppercase; margin-top: 2px; }
              .banner-slogan { font-size: 7px; font-style: italic; font-weight: normal; margin-top: 3px; opacity: 0.9; }
              .title { text-align: center; text-decoration: underline; font-size: 16px; font-weight: bold; margin-bottom: 30px; font-family: Arial, sans-serif; text-transform: uppercase; }
              .meta-list { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px; font-family: Arial, sans-serif; }
              .meta-list td { padding: 4px 0; vertical-align: top; }
              .meta-label { width: 120px; font-weight: bold; text-transform: uppercase; color: #0f172a; }
              .meta-colon { width: 15px; font-weight: bold; color: #0f172a; }
              .meta-value { color: #0f172a; font-weight: bold; }
              .meta-value-regular { color: #334155; font-weight: 500; }
              .meta-subtitle { display: block; font-size: 10.5px; color: #475569; font-weight: bold; margin-top: 1px; }
              .divider { border: 0; border-top: 1px dashed #94a3b8; margin: 20px 0; }
              .content { white-space: pre-wrap; font-size: 13px; text-align: justify; line-height: 1.6; color: #1e293b; padding-top: 5px; }
              @media print {
                body { padding: 0; }
                @page { margin: 2cm; }
              }
            </style>
          </head>
          <body>
            ${latestHeaderImage ? `
              <div style="text-align: center; border-bottom: 2px solid #8B3A3A; padding-bottom: 12px; margin-bottom: 25px; width: 100%;">
                <img src="${latestHeaderImage}" style="max-height: 90px; max-width: 100%; object-fit: contain; display: block; margin: 0 auto;" />
              </div>
            ` : `
              <div class="header-container">
                <div class="logo-side">
                  <div class="logo-badge">🏛️</div>
                  <div class="logo-text">
                    <span class="logo-brand">San Martín</span><br/>
                    <strong>Gobierno Regional</strong>
                  </div>
                </div>
                <div class="banner-side">
                  <div class="banner-main">Dirección Regional de Educación</div>
                  <div class="banner-sub">UGEL Bellavista – Dirección – Área de Gestión Institucional – Racionalización</div>
                  <div class="banner-slogan">"AÑO DEL BICENTENARIO, DE LA CONSOLIDACIÓN DE NUESTRA INDEPENDENCIA, Y DE LA CONMEMORACIÓN DE LAS HEROICAS BATALLAS DE JUNÍN Y AYACUCHO"</div>
                </div>
              </div>
            `}
            
            <div class="title">${activeDocTypeLabel.toUpperCase()} ${getFullDocCode()}</div>
            
            <table class="meta-list">
              <tr>
                <td class="meta-label">${getSalutation(recipients[0]?.nombre)}</td>
                <td class="meta-colon">:</td>
                <td class="meta-value" style="text-transform: uppercase;">
                  ${recipients.map((dest, idx) => `
                    ${idx > 0 ? '<div style="margin-top: 10px;"></div>' : ''}
                    <span style="font-weight: bold;">${dest.nombre || '-----'}</span>
                    ${dest.cargo ? `<span class="meta-subtitle">${dest.cargo}</span>` : ''}
                  `).join('')}
                </td>
              </tr>
              <tr>
                <td class="meta-label">DE</td>
                <td class="meta-colon">:</td>
                <td class="meta-value" style="text-transform: uppercase;">
                  ${currentUser.name}
                  <span class="meta-subtitle">${currentUser.role}</span>
                </td>
              </tr>
              <tr>
                <td class="meta-label">ASUNTO</td>
                <td class="meta-colon">:</td>
                <td class="meta-value" style="text-transform: uppercase;">${asunto}</td>
              </tr>
              <tr>
                <td class="meta-label">REFERENCIA</td>
                <td class="meta-colon">:</td>
                <td class="meta-value-regular">${referencia || 'SIN REFERENCIA'}</td>
              </tr>
              <tr>
                <td class="meta-label">LUGAR Y FECHA</td>
                <td class="meta-colon">:</td>
                <td class="meta-value-regular">Bellavista, ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
              </tr>
            </table>
            
            <hr class="divider" />
            
            <div class="content">${cleanText || '◇ la IA redactará el cuerpo aquí'}</div>
            
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100 font-sans" id="upload_view">
      
      {/* Dynamic Upper Header block matching screenshot */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Nuevo documento
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Redacta cualquier tipo de documento con ayuda de la IA
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-sm text-[11px] text-slate-500 font-medium">
          {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Input Form Parameters matching mockup perfectly */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3.5" id="form_panel">
          


          <div className="space-y-3">
            
            {/* Field 1: Tipo de documento & Área / Oficina */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Tipo de documento
                  </label>
                  {templateMatch && (templateMatch.matchLevel === 'exact' || templateMatch.matchLevel === 'parent') && (
                    <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border transition-all ${
                      templateMatch.matchLevel === 'exact' 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    }`}>
                      {templateMatch.matchLevel === 'exact' && '🟢 Plantilla Oficial'}
                      {templateMatch.matchLevel === 'parent' && `🟡 Heredada`}
                    </span>
                  )}
                </div>
                <select 
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-colors font-medium"
                >
                  {ALL_DOC_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {docType === 'Otros' && (
                  <input 
                    type="text"
                    required
                    placeholder="Especifique tipo de documento..."
                    value={customDocType}
                    onChange={(e) => setCustomDocType(e.target.value)}
                    className="w-full mt-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all font-semibold uppercase"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Área / Oficina Emisora
                </label>
                <select 
                  value={selectedAreaId}
                  onChange={(e) => setSelectedAreaId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-colors font-medium"
                >
                  {(areasList.length > 0 ? areasList : [
                    { id: 'adm', name: 'Área de Administración (ADM)' },
                    { id: 'agi', name: 'Área de Gestión Institucional (AGI)' },
                    { id: 'agp', name: 'Área de Gestión Pedagógica (AGP)' },
                    { id: 'rrhh', name: 'Área de Recursos Humanos (RRHH)' },
                    { id: 'dir', name: 'Dirección (DIR)' }
                  ]).map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.parentAreaId ? `↳ ${a.name}` : a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>



            {/* Field 2: N° de documento (Manual / Correlativo) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  N° de documento (Manual / Correlativo)
                </label>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  Autoincremento
                </span>
              </div>
              <input 
                type="text" 
                placeholder="0001"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 font-mono font-bold focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>



            {/* Recipients Section */}
            <div className="space-y-3 border-t border-slate-100 dark:border-slate-800/60 pt-3" id="recipients_section">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">
                  Destinatario(s) del documento
                </label>
                <button
                  type="button"
                  onClick={handleAddRecipient}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold transition-all flex items-center gap-1 active:scale-95"
                >
                  <Plus size={12} />
                  <span>Añadir Destinatario</span>
                </button>
              </div>

              <div className="space-y-3">
                {recipients.map((rec, index) => (
                  <div key={rec.id} className="relative bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100/70 dark:border-slate-800/60 p-3 rounded-xl space-y-2.5">
                    
                    {/* Header line for recipient */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Destinatario {index + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {/* Save to directory button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!rec.nombre.trim()) {
                              triggerAlert('Campo Faltante', 'Por favor ingrese un nombre de destinatario primero.', 'warning');
                              return;
                            }
                            // Save this specific recipient to local storage directory
                            const newRec = {
                              id: Date.now().toString(),
                              nombre: rec.nombre.trim().toUpperCase(),
                              cargo: rec.cargo.trim().toUpperCase()
                            };
                            const updatedList = [...savedRecipients];
                            // Check if already exists
                            if (!updatedList.some(r => r.nombre === newRec.nombre)) {
                              updatedList.push(newRec);
                              safeStorage.setItem('saved_destinatarios_list', JSON.stringify(updatedList));
                              setSavedRecipients(updatedList);
                              triggerAlert('Directorio Actualizado', 'Destinatario guardado en el directorio UGEL exitosamente.', 'success');
                            } else {
                              triggerAlert('Ya Existe', 'Este destinatario ya se encuentra registrado en el directorio.', 'info');
                            }
                          }}
                          className="p-1 rounded hover:bg-slate-250 dark:hover:bg-slate-850 text-blue-600 dark:text-blue-400 transition-colors"
                          title="Guardar en directorio"
                        >
                          <UserPlus size={13} />
                        </button>

                        {/* Delete button (only if more than 1) */}
                        {recipients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRecipient(index)}
                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 transition-colors"
                            title="Eliminar este destinatario"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      
                      {/* Name input with autocomplete dropdown */}
                      <div className="space-y-1 relative">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Nombre completo
                        </label>
                        <input 
                          type="text" 
                          placeholder="Ej. Sr. Juan Pérez Ramos"
                          value={rec.nombre}
                          onFocus={() => setActiveDropdownIndex(index)}
                          onBlur={() => {
                            setTimeout(() => {
                              if (activeDropdownIndex === index) {
                                setActiveDropdownIndex(null);
                              }
                            }, 200);
                          }}
                          onChange={(e) => {
                            handleRecipientChange(index, 'nombre', e.target.value);
                            setActiveDropdownIndex(index);
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                        />

                        {/* Dropdown overlay specifically for this row */}
                        {activeDropdownIndex === index && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 max-h-48 overflow-y-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 divide-y divide-slate-50 dark:divide-slate-900/60 font-sans">
                            {savedRecipients.filter(r => 
                              !rec.nombre || r.nombre.toLowerCase().includes(rec.nombre.toLowerCase())
                            ).length === 0 ? (
                              <div className="p-3 text-[11px] text-slate-400 italic text-center">
                                Ningún destinatario coincide. Guarde uno nuevo en el ícono de arriba.
                              </div>
                            ) : (
                              savedRecipients.filter(r => 
                                !rec.nombre || r.nombre.toLowerCase().includes(rec.nombre.toLowerCase())
                              ).map((recItem) => (
                                <div
                                  key={recItem.id}
                                  onMouseDown={() => {
                                    handleRecipientChange(index, 'nombre', recItem.nombre);
                                    handleRecipientChange(index, 'cargo', recItem.cargo);
                                    setActiveDropdownIndex(null);
                                  }}
                                  className="p-2.5 text-left text-[11px] hover:bg-indigo-50 dark:hover:bg-slate-900/60 cursor-pointer transition-all"
                                >
                                  <div className="font-bold text-slate-900 dark:text-white uppercase">{recItem.nombre}</div>
                                  <div className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase mt-0.5">{recItem.cargo}</div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Cargo input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Cargo / Puesto
                        </label>
                        <input 
                          type="text" 
                          placeholder="Ej. Director de la IE N° 1234"
                          value={rec.cargo}
                          onChange={(e) => handleRecipientChange(index, 'cargo', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Field 6: Asunto */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Asunto
              </label>
              <input 
                type="text" 
                placeholder="Ej. Informe de actividades del mes de junio"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Field 7: Referencia */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Referencia (opcional)
              </label>
              <input 
                type="text" 
                placeholder="Ej. Oficio N° 045-2026-UGEL"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Field 8: Documentos de referencia / Adjuntar */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                Documento(s) de referencia para la IA (opcional)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 text-xs font-semibold transition-all shadow-sm"
                >
                  <Upload size={13} />
                  <span>Adjuntar PDF/Word/TXT</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSamplesList(!showSamplesList)}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-slate-100 hover:bg-slate-100/80 dark:border-slate-800 dark:hover:bg-slate-800/80 text-xs text-slate-500 font-medium transition-all"
                >
                  <span>Cargar Demo...</span>
                </button>
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".txt,.doc,.docx,.pdf"
                className="hidden" 
              />

              {showSamplesList && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 space-y-1 animate-fade-in">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Demos Disponibles:</span>
                  {SAMPLE_DOCS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleLoadSample(s.id)}
                      className="w-full text-left p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 border border-slate-200/50 dark:border-slate-800/60 text-xs text-indigo-500 font-medium truncate flex items-center justify-between"
                    >
                      <span className="truncate">{s.label}</span>
                      <ChevronRight size={11} />
                    </button>
                  ))}
                </div>
              )}

              {uploadedFileName && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs border border-emerald-500/10">
                  <CheckCircle size={13} className="shrink-0" />
                  <span className="font-semibold truncate">Adjunto: {uploadedFileName}</span>
                  {loadingOcr && <RefreshCw size={11} className="animate-spin ml-auto shrink-0" />}
                </div>
              )}

              {ocrOptimizationInfo && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs border border-amber-500/10 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Zap size={13} className="animate-pulse" />
                    <span>🍃 Optimización de Hojas Activa</span>
                  </div>
                  <p className="text-[10px] leading-relaxed opacity-90">
                    El original tiene <strong>{ocrOptimizationInfo.originalPageCount} págs</strong>. Extraído únicamente primera y última para ahorrar tokens.
                  </p>
                </div>
              )}

              {originalOcrValues && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
                    <BrainCircuit size={14} />
                    <span>🧠 Aprendizaje Activo de la IA</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Si hay errores de extracción, corrígelos arriba. El sistema aprenderá.
                  </p>
                  
                  {(referencia !== originalOcrValues.referencia || 
                    destinatario !== originalOcrValues.solicitante || 
                    asunto !== originalOcrValues.tema) ? (
                    <div className="space-y-1.5">
                      <div className="bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-indigo-100 dark:border-slate-800 space-y-1 text-[10px]">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 block uppercase text-[8px] tracking-wider">Correcciones:</span>
                        {referencia !== originalOcrValues.referencia && (
                          <div className="flex items-start gap-1">
                            <span className="font-semibold text-slate-500">Ref:</span>
                            <span className="line-through text-red-500 font-mono">{originalOcrValues.referencia || 'Vacio'}</span>
                            <span className="text-emerald-600 font-bold font-mono">→ {referencia}</span>
                          </div>
                        )}
                        {destinatario !== originalOcrValues.solicitante && (
                          <div className="flex items-start gap-1">
                            <span className="font-semibold text-slate-500">Rem:</span>
                            <span className="line-through text-red-500 font-mono">{originalOcrValues.solicitante || 'Vacio'}</span>
                            <span className="text-emerald-600 font-bold font-mono">→ {destinatario}</span>
                          </div>
                        )}
                        {asunto !== originalOcrValues.tema && (
                          <div className="flex items-start gap-1">
                            <span className="font-semibold text-slate-500">Asu:</span>
                            <span className="line-through text-red-500 font-mono">{originalOcrValues.tema || 'Vacio'}</span>
                            <span className="text-emerald-600 font-bold font-mono">→ {asunto}</span>
                          </div>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleSaveLearning}
                        className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                      >
                        <Save size={12} />
                        <span>Enseñar a la IA</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg font-medium text-[10px] text-center border border-emerald-500/5">
                      ✓ Coincide perfectamente.
                    </div>
                  )}
                </div>
              )}

              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                Se usará como contexto adicional al redactar.
              </p>
            </div>

            {/* Field 9: Contexto / notas */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Contexto / notas para la IA
              </label>
              <textarea 
                rows={3}
                placeholder="Cuéntame qué pasó, datos clave, fechas, resultados a incluir..."
                value={contextoNotas}
                onChange={(e) => setContextoNotas(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            {/* Main generation trigger */}
            <div className="pt-1.5">
              <button
                type="button"
                onClick={triggerDraftGeneration}
                disabled={loadingDraft || loadingOcr}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loadingDraft ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Sparkles size={13} />
                )}
                <span>Generar Redacción con IA</span>
              </button>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Real-Time Official Document Live Preview Sheet */}
        <div className="lg:col-span-6 space-y-4">
          
          <div className="rounded-2xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 p-4 space-y-3">
            
            {generatedDraft ? (
              <div className="flex items-center gap-1.5 justify-end pb-2 border-b border-slate-200/40 dark:border-slate-800/40">
                <button
                  onClick={() => {
                    if (isEditingDraft) {
                      setGeneratedDraft(editedDraftValue);
                      setIsEditingDraft(false);
                      runAdministrativeAudit(editedDraftValue);
                    } else {
                      setEditedDraftValue(generatedDraft);
                      setIsEditingDraft(true);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 ${isEditingDraft ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300'}`}
                >
                  {isEditingDraft ? <CheckCircle size={12} /> : <Edit3 size={12} />}
                  <span>{isEditingDraft ? 'Guardar' : 'Editar Borrador'}</span>
                </button>
                
                {isEditingDraft && (
                  <button
                    onClick={async () => {
                      try {
                        await fetch('/api/learning', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            campo: `Redacción ${docType}`,
                            valorErroneo: generatedDraft.slice(0, 300) + '...',
                            valorCorregido: editedDraftValue.slice(0, 300) + '...',
                            contextoTexto: referenceFileText ? referenceFileText.slice(0, 800) : 'Corrección de estilo',
                            explicacion: 'El usuario editó el estilo de redacción de la IA directamente en el documento.',
                            usuario: currentUser.name
                          })
                        });
                        setGeneratedDraft(editedDraftValue);
                        setIsEditingDraft(false);
                        alert('🧠 ¡Enseñado con éxito! La IA ha analizado los cambios y adaptará su estilo de redacción en los próximos informes.');
                      } catch (err: any) {
                        alert(`Error al guardar aprendizaje: ${err.message}`);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl border bg-indigo-50 hover:bg-indigo-100 border-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900/60 dark:text-indigo-400 text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                    title="Enseñar tus correcciones de estilo y redacción a la IA"
                  >
                    <BrainCircuit size={12} />
                    <span>Enseñar a la IA</span>
                  </button>
                )}
              </div>
            ) : null}

            {/* Document sheet template paper layout */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 rounded-xl shadow-md p-5 sm:p-6 min-h-[500px] max-h-[620px] overflow-y-auto text-slate-800 dark:text-slate-200 text-xs leading-relaxed flex flex-col justify-between relative" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
              
              {/* Document Sheet Head */}
              <div className="space-y-3">
                
                {currentHeaderImage ? (
                  <div className="w-full pb-2 select-none flex justify-center">
                    <img src={currentHeaderImage} alt="Membrete institucional" className="max-h-14 w-full object-contain" />
                  </div>
                ) : (
                  <div className="w-full pb-2 border-b border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center p-2 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg select-none font-sans">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">▲ MEMBRETE DE ÁREA (SIN CARGAR) ▲</span>
                    <span className="text-[7px] text-slate-400/80 mt-0.5 text-center">Configure e integre la imagen oficial del membrete en Configuraciones.</span>
                  </div>
                )}

                {activeDocTypeLabel.toLowerCase() === 'carta' ? (
                  /* --- CARTA OFFICIAL PREVIEW LAYOUT --- */
                  <div className="space-y-3 font-sans text-[11px] text-slate-900 dark:text-slate-100">
                    <div className="text-right text-slate-500 font-medium">
                      Bellavista, {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.
                    </div>
                    
                    <div className="text-left font-bold text-slate-950 dark:text-white uppercase">
                      {activeDocTypeLabel.toUpperCase()} N° {docNumber}{docSuffix}
                    </div>

                    <div className="text-left leading-normal">
                      <strong className="uppercase">SEÑOR&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {recipients[0]?.nombre || '-----'}</strong>
                      {recipients[0]?.cargo && (
                        <span className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase mt-0.5 ml-20 sm:ml-24">
                          {recipients[0].cargo}
                        </span>
                      )}
                      <span className="block font-bold mt-0.5 uppercase ml-20 sm:ml-24">BELLAVISTA.-</span>
                    </div>

                    <div className="text-left">
                      <strong>ASUNTO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span className="uppercase">{asunto || '-----'}</span></strong>
                    </div>

                    {referencia && (
                      <div className="text-left">
                        <strong>REF. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span className="uppercase">{referencia}</span></strong>
                      </div>
                    )}

                    <div className="text-center text-slate-300 dark:text-slate-700 tracking-tighter select-none font-extrabold">
                      ------------------------------------------------------------------------------------------------------------------------
                    </div>
                  </div>
                ) : (
                  /* --- STANDARD MEMORANDO/INFORME/OFICIO PREVIEW LAYOUT --- */
                  <>
                    {/* Document Main Title centered and underlined (as shown in second image) */}
                    <div className="text-center font-extrabold text-slate-900 dark:text-white uppercase text-xs sm:text-xs tracking-wide underline pt-1 font-sans">
                      {activeDocTypeLabel.toUpperCase() || 'DOCUMENTO'} {getFullDocCode()}
                    </div>

                    {/* Metadata Sheet List (perfectly left-aligned to the margin, matching the red vertical line from Image 2) */}
                    <div className="space-y-1.5 pt-2 text-[10px] sm:text-[11px] font-sans text-slate-900 dark:text-slate-100">
                      
                      <div className="flex items-start">
                        <div className="w-20 sm:w-24 font-extrabold tracking-wide shrink-0 text-slate-950 dark:text-white">{getSalutation(recipients[0]?.nombre)}</div>
                        <div className="px-1.5 font-extrabold shrink-0 text-slate-950 dark:text-white">:</div>
                        <div className="flex-1 font-bold text-slate-950 dark:text-white">
                          {recipients.length > 0 && recipients[0].nombre ? (
                            <div className="space-y-2">
                              {recipients.map((rec) => (
                                <div key={rec.id} className="uppercase">
                                  {rec.nombre}
                                  {rec.cargo && (
                                    <span className="block text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-400 font-extrabold mt-0.5 uppercase">
                                      {rec.cargo}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-slate-300 dark:text-slate-700 italic">
                              TONY JHON FERNANDEZ DIAZ
                              <span className="block text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-600 font-bold mt-0.5 uppercase">
                                JEFE DEL ÁREA DE GESTIÓN INSTITUCIONAL
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="w-20 sm:w-24 font-extrabold tracking-wide shrink-0 text-slate-950 dark:text-white">DE</div>
                        <div className="px-1.5 font-extrabold shrink-0 text-slate-950 dark:text-white">:</div>
                        <div className="flex-1 font-bold text-slate-950 dark:text-white">
                          <div className="uppercase">
                            {remitenteNombre || currentUser.name}
                            <span className="block text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-400 font-extrabold mt-0.5 uppercase">
                              {remitenteCargo || currentUser.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="w-20 sm:w-24 font-extrabold tracking-wide shrink-0 text-slate-950 dark:text-white">ASUNTO</div>
                        <div className="px-1.5 font-extrabold shrink-0 text-slate-950 dark:text-white">:</div>
                        <div className="flex-1 font-bold text-slate-950 dark:text-white uppercase">
                          {asunto || <span className="text-slate-300 dark:text-slate-700 italic font-bold">REQUERIMIENTO DE PLAZAS PARA 2025</span>}
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="w-20 sm:w-24 font-extrabold tracking-wide shrink-0 text-slate-950 dark:text-white">REFERENCIA</div>
                        <div className="px-1.5 font-extrabold shrink-0 text-slate-950 dark:text-white">:</div>
                        <div className="flex-1 font-semibold text-slate-800 dark:text-slate-200">
                          {referencia || <span className="text-slate-300 dark:text-slate-700 italic font-semibold font-sans">OFICIO N° 169-2024 DIR-ODEC-J</span>}
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="w-20 sm:w-24 font-extrabold tracking-wide shrink-0 text-slate-950 dark:text-white">LUGAR Y FECHA</div>
                        <div className="px-1.5 font-extrabold shrink-0 text-slate-950 dark:text-white">:</div>
                        <div className="flex-1 font-medium text-slate-800 dark:text-slate-200">
                          Bellavista, {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </div>

                    </div>

                    {/* Dotted/Dashed divider as shown in Image 2 */}
                    <div className="border-t border-dashed border-slate-300 dark:border-slate-800 my-2.5 select-none font-sans" />
                  </>
                )}
              </div>

              {/* Document Sheet Body Area */}
              <div className="flex-1 py-2 flex flex-col justify-start">
                {generatedDraft ? (
                  isEditingDraft ? (
                    <textarea
                      rows={10}
                      value={editedDraftValue}
                      onChange={(e) => setEditedDraftValue(e.target.value)}
                      className="w-full p-3 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-slate-50/50 dark:bg-slate-900/50 text-[12px] sm:text-[13px] text-justify font-mono tracking-wide leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      style={{ fontFamily: 'monospace' }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-slate-900 dark:text-slate-100 text-[12px] sm:text-[13.5px] text-justify font-normal tracking-wide" style={{ fontFamily: 'Arial, Helvetica, sans-serif', lineHeight: '1.65', letterSpacing: '0.01em' }}>
                      {cleanDocumentText(generatedDraft)}
                    </div>
                  )
                ) : (
                  <div className="space-y-4 flex-1 flex flex-col justify-center">
                    
                    {/* Simulated vector skeletons */}
                    <div className="space-y-2 opacity-30 select-none">
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full w-full"></div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full w-11/12"></div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full w-10/12"></div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full w-9/12"></div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full w-full"></div>
                    </div>

                    <div className="text-center py-2 px-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 max-w-sm mx-auto flex items-center justify-center gap-1.5 shadow-inner font-sans text-[11px]">
                      <span>◇ la IA redactará el cuerpo del documento aquí</span>
                    </div>

                    <div className="space-y-2 opacity-30 select-none pt-2">
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full w-11/12"></div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full w-full"></div>
                    </div>

                  </div>
                )}
              </div>

              {/* Center aligned "Atentamente," with empty signature area */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-900/40 flex flex-col items-center justify-center font-sans text-[10px] text-slate-800 dark:text-slate-200 select-none">
                <div className="font-bold text-center">Atentamente,</div>
                
                {/* Space for virtual signature */}
                <div className="h-16"></div>
              </div>

            </div>

            {/* Detector de Errores Administrativos */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl shadow-lg p-5 space-y-4" id="error_detector_panel">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Detector de Errores Administrativos
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Auditoría legal y de consistencia formal de la UGEL
                    </p>
                  </div>
                </div>
                {errorReport.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold">
                    {errorReport.length} {errorReport.length === 1 ? 'observación' : 'observaciones'}
                  </span>
                )}
              </div>

              {generatedDraft ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      El asistente escanea el borrador en busca de errores ortográficos, inconsistencias en cargos o expediente, y deficiencias en secciones obligatorias.
                    </p>
                    <button
                      type="button"
                      onClick={() => runAdministrativeAudit(generatedDraft)}
                      disabled={auditingErrors}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white text-[11px] font-bold shadow-sm transition-all shrink-0 flex items-center gap-1"
                    >
                      {auditingErrors ? (
                        <RefreshCw size={11} className="animate-spin" />
                      ) : (
                        <Sparkles size={11} />
                      )}
                      <span>Auditar Borrador</span>
                    </button>
                  </div>

                  {auditingErrors && (
                    <div className="p-6 text-center space-y-2 border border-rose-500/10 bg-rose-500/5 rounded-2xl animate-pulse">
                      <RefreshCw size={18} className="animate-spin text-rose-500 mx-auto" />
                      <p className="text-[11px] text-rose-500 font-bold uppercase tracking-wider">
                        Auditor de consistencia legal analizando el borrador...
                      </p>
                      <p className="text-[9px] text-slate-400">
                        Verificando normativas de redacción pública del MINEDU y concordancia de datos de origen.
                      </p>
                    </div>
                  )}

                  {!auditingErrors && errorReport.length === 0 && (
                    <div className="p-4 text-center border border-emerald-500/10 bg-emerald-500/5 rounded-xl text-emerald-600 dark:text-emerald-400 font-medium text-[11px] flex items-center justify-center gap-1.5">
                      <CheckCircle size={14} />
                      <span>¡Ningún error formal detectado! El borrador se ajusta a las directivas de la UGEL.</span>
                    </div>
                  )}

                  {!auditingErrors && errorReport.length > 0 && (
                    <div className="space-y-2.5 max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 pr-1">
                      {errorReport.map((err) => (
                        <div key={err.id} className="pt-2.5 first:pt-0 space-y-2">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                err.gravedad === 'Crítico' 
                                  ? 'bg-red-500/10 text-red-500 border border-red-500/10' 
                                  : err.gravedad === 'Advertencia' 
                                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/10' 
                                  : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/10'
                              }`}>
                                {err.gravedad}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-semibold">
                                {err.seccion}
                              </span>
                            </div>
                          </div>

                          <div className="text-[11px] space-y-1">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {err.descripcion}
                            </p>
                            <p className="text-slate-500 dark:text-slate-400 italic">
                              <strong className="text-indigo-600 dark:text-indigo-400">Sugerencia: </strong>{err.sugerencia}
                            </p>
                          </div>

                          {err.targetText && err.replacementText && (
                            <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                              <div className="min-w-0 flex-1 text-[10px] space-y-0.5">
                                <div className="truncate text-slate-400 line-through">
                                  {err.targetText}
                                </div>
                                <div className="truncate text-emerald-600 dark:text-emerald-400 font-bold">
                                  {err.replacementText}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  // Perform replace in generatedDraft
                                  const text = generatedDraft;
                                  if (text.includes(err.targetText!)) {
                                    const nextText = text.replace(err.targetText!, err.replacementText!);
                                    setGeneratedDraft(nextText);
                                    setEditedDraftValue(nextText);
                                    setErrorReport(prev => prev.filter(x => x.id !== err.id));
                                    setSuccessToast(`Se aplicó corrección para: "${err.seccion}"`);
                                    setTimeout(() => setSuccessToast(null), 3000);
                                  } else {
                                    const regex = new RegExp(err.targetText!.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
                                    if (regex.test(text)) {
                                      const nextText = text.replace(regex, err.replacementText!);
                                      setGeneratedDraft(nextText);
                                      setEditedDraftValue(nextText);
                                      setErrorReport(prev => prev.filter(x => x.id !== err.id));
                                      setSuccessToast(`Se aplicó corrección para: "${err.seccion}"`);
                                      setTimeout(() => setSuccessToast(null), 3000);
                                    } else {
                                      triggerAlert('Texto no encontrado', 'No se encontró la frase exacta en el documento. Es posible que ya la hayas modificado.', 'warning');
                                    }
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold hover:bg-emerald-100 transition-all shrink-0 active:scale-95 flex items-center gap-0.5"
                              >
                                <Check size={10} />
                                <span>Aplicar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {successToast && (
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 text-[10px] font-bold text-center border border-emerald-500/10 animate-fade-in">
                      {successToast}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center border-2 border-dashed border-slate-100 dark:border-slate-800/80 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 text-slate-400 text-[11px]">
                  El detector de errores se activará tan pronto como la IA genere el borrador de su documento.
                </div>
              )}
            </div>

            {/* Provider diagnostics / Failover tracker logs for Draft */}
            {draftLog && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 space-y-2 text-[10px] font-mono shadow-sm">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Zap size={11} className="text-amber-500 animate-pulse" />
                  <span>Log de Conmutación IA en vivo:</span>
                </div>
                <div className="flex flex-wrap gap-1 border-t border-b border-slate-50 dark:border-slate-800 py-1.5">
                  {draftLog.attempted.map((att, i) => {
                    const isSucceeded = att === draftLog.iaUtilizada.split(' (')[0].toLowerCase() || i === draftLog.attempted.length - 1;
                    return (
                      <span 
                        key={att} 
                        className={`px-1.5 py-0.5 rounded ${
                          isSucceeded 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 font-bold' 
                            : 'bg-red-500/10 text-red-500 line-through border border-red-500/10'
                        }`}
                      >
                        {att.toUpperCase()} {isSucceeded ? '✓' : '❌'}
                      </span>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[9px]">
                  <span>Motor Respondedor: <strong className="text-indigo-500">{draftLog.iaUtilizada}</strong></span>
                  <span>Latencia: <strong>{draftLog.responseTimeMs}ms</strong></span>
                </div>
              </div>
            )}

            {/* Actions panel for completed drafts */}
            {generatedDraft && (
              <div className="pt-2 flex flex-col gap-3">
                
                {/* Export panel buttons */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={exportToWord}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <Download size={14} className="text-blue-500" />
                    <span>Descargar Word</span>
                  </button>

                  <button 
                    onClick={handlePrint}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <FileText size={14} className="text-red-500" />
                    <span>Descargar PDF</span>
                  </button>
                </div>

                {/* Save button block */}
                {savedSuccess ? (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle size={16} />
                    <span>¡Documento guardado exitosamente en el archivo digital!</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSaveDocument}
                    disabled={saving}
                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white font-semibold text-xs shadow flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={13} className="text-indigo-400" />}
                    <span>Registrar en Archivo Digital</span>
                  </button>
                )}

              </div>
            )}

          </div>

        </div>

      </div>

      {/* Custom Modal Overlay */}
      {alertState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" id="upload_alert_overlay">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                alertState.type === 'error' 
                  ? 'bg-red-500/10 text-red-500' 
                  : alertState.type === 'warning' 
                  ? 'bg-amber-500/10 text-amber-500' 
                  : alertState.type === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-500' 
                  : 'bg-indigo-500/10 text-indigo-500'
              }`}>
                {alertState.type === 'error' && <X size={20} />}
                {alertState.type === 'warning' && <AlertCircle size={20} />}
                {alertState.type === 'success' && <Check size={20} />}
                {alertState.type === 'info' && <Info size={20} />}
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {alertState.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {alertState.message}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <button
                type="button"
                onClick={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                className={`px-4 py-2 rounded-lg text-white text-xs font-semibold shadow transition-all ${
                  alertState.type === 'error'
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/10'
                    : alertState.type === 'warning'
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10'
                    : alertState.type === 'success'
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/10'
                }`}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
