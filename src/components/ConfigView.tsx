import React, { useState, useEffect } from 'react';
import { 
  Building2,
  Users,
  Cpu,
  History,
  KeyRound, 
  Settings, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  Sparkles, 
  ShieldAlert, 
  ToggleLeft, 
  ToggleRight, 
  RefreshCw,
  Eye,
  EyeOff,
  HelpCircle,
  AlertCircle,
  Upload,
  X,
  Trash2,
  Edit2,
  Plus,
  Search,
  UserCheck,
  Play,
  Activity,
  AlertTriangle,
  Info,
  FolderOpen,
  Network,
  ChevronRight,
  ChevronDown,
  Folder,
  Building,
  Layers
} from 'lucide-react';
import { AIProvider, User as UserType, SystemLog } from '../types';
import { safeStorage } from '../utils/storage';
import { DEFAULT_RECIPIENTS } from '../defaultRecipients';
import {
  isFolderSaveSupported,
  pickSaveFolder,
  getSaveFolderName,
  clearSaveFolder,
  isFileSystemApiAvailable,
} from '../utils/fileSaver';

const DEFAULT_KEYS: Record<string, string> = {
  groq: ['gsk_', 'DPaoHCYzvuec7NrwbqDMWGdyb3FYeblhTe2EoGy1X7exroxtdHUN'].join(''),
  nvidia: ['nvapi-', 'iAqNYdR3oJjiJEh0eo7AZUYvP3Dj7c4IvjdHYG_6nOYBAt-wNMB_cBo3FQBPEKGI'].join(''),
  openrouter: ['sk-or-', 'v1-30ccd126c8c89b1597b6b9fb472168e384456ef1d5bfa0585d542982d219d537'].join(''),
  gemini: ['AQ.', 'Ab8RN6JHQtccJTi-EHjgLln5ccLI8-q3k--5uETrTOUlD_2hNA'].join('')
};

import LogsView from './LogsView';

interface ConfigViewProps {
  providers: AIProvider[];
  currentUser: UserType;
  onUpdateProviders: (updated: AIProvider[]) => void;
  logs?: SystemLog[];
  onThemeChanged?: (theme: string) => void;
  currentTheme?: string;
}

interface Recipient {
  id: string;
  nombre: string;
  cargo: string;
  sexo?: 'F' | 'M';
  areaId?: string;
}

export default function ConfigView({ providers, currentUser, onUpdateProviders, logs = [], onThemeChanged, currentTheme }: ConfigViewProps) {
  // Tabs management
  const [activeTab, setActiveTab] = useState<'destinatarios' | 'areas' | 'usuarios' | 'ia' | 'logs'>(
    currentUser.role === 'Administrador' ? 'areas' : 'destinatarios'
  );

  // Custom Alert / Confirm Modal State
  const [customModal, setCustomModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'danger' | 'success';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: 'info' | 'warning' | 'danger' | 'success' = 'info') => {
    setCustomModal({
      isOpen: true,
      title,
      message,
      type,
      confirmText: 'Entendido',
      onConfirm: () => setCustomModal(prev => ({ ...prev, isOpen: false }))
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'warning' | 'danger' = 'warning') => {
    setCustomModal({
      isOpen: true,
      title,
      message,
      type,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      onConfirm: () => {
        setCustomModal(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      },
      onCancel: () => setCustomModal(prev => ({ ...prev, isOpen: false }))
    });
  };

  // Area state overrides
  const [savedHeaderImage, setSavedHeaderImage] = useState<string | null>(null);
  const [savedUserName, setSavedUserName] = useState('');
  const [savedUserRole, setSavedUserRole] = useState('');
  const [savedSuffix, setSavedSuffix] = useState('');
  const [savedAutoSavePath, setSavedAutoSavePath] = useState('');

  // Local save-folder (File System Access API)
  const [folderSupported] = useState<boolean>(isFolderSaveSupported());
  const [saveFolderName, setSaveFolderName] = useState<string | null>(null);
  const [folderBusy, setFolderBusy] = useState(false);

  // Recipients state
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recSearch, setRecSearch] = useState('');
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);
  const [newRecName, setNewRecName] = useState('');
  const [newRecCargo, setNewRecCargo] = useState('');
  const [newRecAreaId, setNewRecAreaId] = useState('');
  const [recFilterAreaId, setRecFilterAreaId] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // IA Providers core state
  const [localProviders, setLocalProviders] = useState<AIProvider[]>([]);
  const [simulateFailures, setSimulateFailures] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [editKeys, setEditKeys] = useState<Record<string, string>>({});

  // Custom AI Provider state
  const [showAddProviderForm, setShowAddProviderForm] = useState(false);
  const [newProvId, setNewProvId] = useState('');
  const [newProvName, setNewProvName] = useState('');
  const [newProvApiUrl, setNewProvApiUrl] = useState('');
  const [newProvModelName, setNewProvModelName] = useState('');
  const [newProvApiKey, setNewProvApiKey] = useState('');
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);

  // User Management State
  const [systemUsers, setSystemUsers] = useState<UserType[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Administrador' | 'Secretaria' | 'Jefe' | 'Consulta'>('Secretaria');
  const [userSearch, setUserSearch] = useState('');
  const [userSuccessMessage, setUserSuccessMessage] = useState('');
  const [areasList, setAreasList] = useState<any[]>([]);
  const [newUserAreaId, setNewUserAreaId] = useState('adm');
  const [newUserAreaIds, setNewUserAreaIds] = useState<string[]>([]);
  const [newUserCargo, setNewUserCargo] = useState('');
  const [newUserCondicion, setNewUserCondicion] = useState('');

  // Areas Management States
  const [selectedAreaToEdit, setSelectedAreaToEdit] = useState<any | null>(null);
  const [areaSuffix, setAreaSuffix] = useState('');
  const [areaResponsableNombre, setAreaResponsableNombre] = useState('');
  const [areaResponsableCargo, setAreaResponsableCargo] = useState('');
  const [areaMembreteBase64, setAreaMembreteBase64] = useState('');
  const [areaLinkedUserIds, setAreaLinkedUserIds] = useState<string[]>([]);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['dir']));
  const [showCreateAreaForm, setShowCreateAreaForm] = useState(false);
  const [newAreaData, setNewAreaData] = useState({ id: '', name: '', code: '', parentAreaId: '' });

  useEffect(() => {
    fetch('/api/areas')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAreasList(data);
      })
      .catch(() => {});
  }, []);

  // Visual Theme States
  const [selectedTheme, setSelectedTheme] = useState<string>(currentTheme || 'predeterminado');
  const [savingTheme, setSavingTheme] = useState(false);

  useEffect(() => {
    fetch('/api/config/theme')
      .then(res => res.json())
      .then(data => {
        if (data.theme) {
          setSelectedTheme(data.theme);
        }
      })
      .catch(err => console.error('Error fetching active visual theme:', err));
  }, []);

  const handleSaveTheme = async (themeName: string) => {
    setSavingTheme(true);
    try {
      const response = await fetch('/api/config/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: themeName })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSelectedTheme(themeName);
        if (onThemeChanged) {
          onThemeChanged(themeName);
        }
        showAlert('Estilo Aplicado con Éxito', `La plantilla visual "${themeName.toUpperCase()}" se ha establecido como predeterminada de manera inmediata para todos los usuarios.`, 'success');
      } else {
        throw new Error(data.error || 'No se pudo guardar la configuración.');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Error al aplicar el estilo visual.', 'danger');
    } finally {
      setSavingTheme(false);
    }
  };

  // Feedback states
  const [areaSuccess, setAreaSuccess] = useState(false);
  const [recSuccess, setRecSuccess] = useState(false);

  // Fetch all system users (Admin-only)
  const fetchSystemUsers = async () => {
    setUsersLoading(true);
    try {
      const token = safeStorage.getItem('saved_session_token');
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSystemUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  // Load and seed saved states on mount
  useEffect(() => {
    // 1. Area config
    setSavedHeaderImage(safeStorage.getItem('saved_area_header_image'));
    setSavedUserName(safeStorage.getItem('saved_user_name') || currentUser.name);
    setSavedUserRole(safeStorage.getItem('saved_user_role') || currentUser.role);
    setSavedSuffix(safeStorage.getItem('saved_area_suffix') || '-2026-UGEL-AGI');
    setSavedAutoSavePath(safeStorage.getItem('saved_auto_save_path') || '/documentos_automaticos');

    // 2. Recipients
    const RECIPIENTS_VERSION = 'ugel-2026-v1';
    const savedRecs = safeStorage.getItem('saved_destinatarios_list');
    if (savedRecs && safeStorage.getItem('saved_destinatarios_version') === RECIPIENTS_VERSION) {
      setRecipients(JSON.parse(savedRecs));
    } else {
      safeStorage.setItem('saved_destinatarios_list', JSON.stringify(DEFAULT_RECIPIENTS));
      safeStorage.setItem('saved_destinatarios_version', RECIPIENTS_VERSION);
      setRecipients(DEFAULT_RECIPIENTS);
    }

    // 3. Providers load
    const sorted = [...providers].sort((a, b) => a.priority - b.priority);
    setLocalProviders(sorted);

    // 4. Fetch simulation state
    fetch('/api/config/simulation')
      .then(res => res.json())
      .then(data => setSimulateFailures(data.simulateApiFailures))
      .catch(err => console.error(err));
  }, [providers, currentUser]);

  useEffect(() => {
    if ((activeTab === 'usuarios' || activeTab === 'areas') && currentUser.role === 'Administrador') {
      fetchSystemUsers();
    }
  }, [activeTab, currentUser]);

  // Image Upload handler
  const handleHeaderImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 3 * 1024 * 1024) {
        showAlert('Imagen Excedida', 'La imagen supera el límite recomendado de 3MB. Por favor suba un archivo más liviano.', 'warning');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setSavedHeaderImage(base64);
        safeStorage.setItem('saved_area_header_image', base64);
        setAreaSuccess(true);
        setTimeout(() => setAreaSuccess(false), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveHeaderImage = () => {
    setSavedHeaderImage(null);
    safeStorage.removeItem('saved_area_header_image');
    setAreaSuccess(true);
    setTimeout(() => setAreaSuccess(false), 3000);
  };

  // Save Area specifications
  const handleSaveAreaConfig = (e: React.FormEvent) => {
    e.preventDefault();
    safeStorage.setItem('saved_user_name', savedUserName);
    safeStorage.setItem('saved_user_role', savedUserRole);
    safeStorage.setItem('saved_area_suffix', savedSuffix);
    safeStorage.setItem('saved_auto_save_path', savedAutoSavePath);
    setAreaSuccess(true);
    setTimeout(() => setAreaSuccess(false), 3000);
  };

  // Load the remembered save-folder name on mount
  useEffect(() => {
    if (!folderSupported) return;
    getSaveFolderName().then((name) => setSaveFolderName(name)).catch(() => {});
  }, [folderSupported]);

  // Choose (or change) the destination folder for generated documents
  const handlePickFolder = async () => {
    setFolderBusy(true);
    try {
      const name = await pickSaveFolder();
      setSaveFolderName(name);
      setAreaSuccess(true);
      setTimeout(() => setAreaSuccess(false), 3000);
    } catch (err: any) {
      // The user cancelling the picker throws AbortError; ignore it silently.
      if (err && err.name !== 'AbortError') {
        console.warn('No se pudo seleccionar la carpeta:', err);
      }
    } finally {
      setFolderBusy(false);
    }
  };

  // Reset to the default behaviour (normal browser download)
  const handleClearFolder = async () => {
    await clearSaveFolder();
    setSaveFolderName(null);
    setAreaSuccess(true);
    setTimeout(() => setAreaSuccess(false), 3000);
  };

  // Recipients functions
  const handleAddRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecName.trim() || !newRecCargo.trim()) return;

    const newRec: Recipient = {
      id: `rec-${Date.now()}`,
      nombre: newRecName.trim().toUpperCase(),
      cargo: newRecCargo.trim().toUpperCase(),
      areaId: newRecAreaId || undefined
    };

    const updated = [...recipients, newRec];
    setRecipients(updated);
    safeStorage.setItem('saved_destinatarios_list', JSON.stringify(updated));

    setNewRecName('');
    setNewRecCargo('');
    setNewRecAreaId('');
    setShowAddForm(false);
    setRecSuccess(true);
    setTimeout(() => setRecSuccess(false), 3000);
  };

  const handleUpdateRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecipient || !editingRecipient.nombre.trim() || !editingRecipient.cargo.trim()) return;

    const updated = recipients.map(r => r.id === editingRecipient.id ? {
      ...editingRecipient,
      nombre: editingRecipient.nombre.toUpperCase(),
      cargo: editingRecipient.cargo.toUpperCase()
    } : r);

    setRecipients(updated);
    safeStorage.setItem('saved_destinatarios_list', JSON.stringify(updated));
    setEditingRecipient(null);
    setRecSuccess(true);
    setTimeout(() => setRecSuccess(false), 3000);
  };

  const handleDeleteRecipient = (id: string) => {
    showConfirm(
      'Eliminar Destinatario',
      '¿Está seguro de eliminar este destinatario?',
      () => {
        const updated = recipients.filter(r => r.id !== id);
        setRecipients(updated);
        safeStorage.setItem('saved_destinatarios_list', JSON.stringify(updated));
      },
      'danger'
    );
  };

  // Provider Priorities swapped
  const moveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...localProviders];
    const temp = copy[index];
    copy[index] = copy[index - 1];
    copy[index - 1] = temp;
    const updated = copy.map((p, idx) => ({ ...p, priority: idx + 1 }));
    setLocalProviders(updated);
  };

  const moveDown = (index: number) => {
    if (index === localProviders.length - 1) return;
    const copy = [...localProviders];
    const temp = copy[index];
    copy[index] = copy[index + 1];
    copy[index + 1] = temp;
    const updated = copy.map((p, idx) => ({ ...p, priority: idx + 1 }));
    setLocalProviders(updated);
  };

  const toggleEnabled = (id: string) => {
    const updated = localProviders.map(p => {
      if (p.id === id) {
        return { ...p, enabled: !p.enabled };
      }
      return p;
    });
    setLocalProviders(updated);
  };

  const handleKeyChange = (id: string, val: string) => {
    setEditKeys(prev => ({ ...prev, [id]: val }));
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleSimulation = async () => {
    const nextState = !simulateFailures;
    setSimulateFailures(nextState);
    try {
      const token = safeStorage.getItem('saved_session_token');
      await fetch('/api/config/simulation', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ simulate: nextState })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProviderField = (id: string, field: keyof AIProvider, value: any) => {
    setLocalProviders(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleSaveProvidersConfig = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      const payload = localProviders.map(p => {
        const customKey = editKeys[p.id];
        return {
          ...p,
          apiKey: (customKey && customKey.trim() !== '') ? customKey.trim() : undefined
        };
      });

      const token = safeStorage.getItem('saved_session_token');
      const response = await fetch('/api/providers', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          providers: payload,
          usuario: currentUser.name
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error al guardar configuración.');

      if (result.providers) {
        const sorted = result.providers.sort((a: any, b: any) => a.priority - b.priority);
        setLocalProviders(sorted);
        if (onUpdateProviders) {
          onUpdateProviders(sorted);
        }
      }
      setEditKeys({});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      showAlert('Error al Guardar', err.message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvId.trim() || !newProvName.trim() || !newProvModelName.trim()) {
      showAlert('Campos Obligatorios', 'Por favor ingrese todos los campos obligatorios del proveedor.', 'warning');
      return;
    }

    const cleanId = newProvId.trim().toLowerCase().replace(/\s+/g, '-');

    try {
      const token = safeStorage.getItem('saved_session_token');
      const response = await fetch('/api/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: {
            id: cleanId,
            name: newProvName.trim(),
            apiUrl: newProvApiUrl.trim() || undefined,
            modelName: newProvModelName.trim(),
            apiKey: newProvApiKey.trim() || undefined,
            enabled: true
          },
          usuario: currentUser.name
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Fallo al agregar el proveedor.');
      }

      setLocalProviders(result.providers.sort((a: any, b: any) => a.priority - b.priority));
      if (onUpdateProviders) {
        onUpdateProviders(result.providers);
      }

      setSuccess(true);
      setShowAddProviderForm(false);
      setNewProvId('');
      setNewProvName('');
      setNewProvApiUrl('');
      setNewProvModelName('');
      setNewProvApiKey('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      showAlert('Error al Agregar', err.message, 'danger');
    }
  };

  const handleDeleteProvider = async (id: string, name: string) => {
    if (id === 'gemini') {
      showAlert('Acción Restringida', 'No se puede eliminar el proveedor fallback de Google Gemini.', 'warning');
      return;
    }
    showConfirm(
      'Eliminar Proveedor',
      `¿Está seguro de eliminar al proveedor "${name}"?`,
      async () => {
        try {
          const token = safeStorage.getItem('saved_session_token');
          const response = await fetch(`/api/providers/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              usuario: currentUser.name
            })
          });

          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || 'Fallo al eliminar el proveedor.');
          }

          setLocalProviders(result.providers.sort((a: any, b: any) => a.priority - b.priority));
          if (onUpdateProviders) {
            onUpdateProviders(result.providers);
          }

          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
          showAlert('Error al Eliminar', err.message, 'danger');
        }
      },
      'danger'
    );
  };

  // User Management Actions
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserUsername.trim() || !newUserName.trim() || !newUserPassword.trim() || !newUserRole) return;

    try {
      const token = safeStorage.getItem('saved_session_token');
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
          body: JSON.stringify({
            username: newUserUsername.trim(),
            name: newUserName.trim(),
            role: newUserRole,
            password: newUserPassword.trim(),
            areaId: newUserAreaId,
            areaIds: newUserAreaIds.length > 0 ? newUserAreaIds : (newUserAreaId ? [newUserAreaId] : []),
            cargo: newUserCargo.trim(),
            condicion: newUserCondicion.trim() || undefined
          })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Fallo al agregar usuario');
      }

      setUserSuccessMessage('¡Usuario registrado con éxito!');
      setNewUserUsername('');
      setNewUserName('');
      setNewUserPassword('');
      setNewUserRole('Secretaria');
      setNewUserCargo('');
      setShowAddUserForm(false);
      fetchSystemUsers();
      setTimeout(() => setUserSuccessMessage(''), 3000);
    } catch (err: any) {
      showAlert('Error al Registrar', err.message, 'danger');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.name.trim()) return;

    try {
      const token = safeStorage.getItem('saved_session_token');
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editingUser.name.trim(),
          role: editingUser.role,
          password: editingUser.password || undefined,
          areaId: editingUser.areaId,
          areaIds: editingUser.areaIds || (editingUser.areaId ? [editingUser.areaId] : []),
          cargo: editingUser.cargo?.trim(),
          condicion: editingUser.condicion?.trim() || undefined
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Fallo al actualizar usuario');
      }

      setUserSuccessMessage('¡Usuario actualizado con éxito!');
      setEditingUser(null);
      fetchSystemUsers();
      setTimeout(() => setUserSuccessMessage(''), 3000);
    } catch (err: any) {
      showAlert('Error al Actualizar', err.message, 'danger');
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (username === 'admin') {
      showAlert('Acción Restringida', 'No se puede eliminar al Administrador principal.', 'warning');
      return;
    }
    if (username === currentUser.username) {
      showAlert('Acción Restringida', 'No puedes eliminar tu propio usuario en sesión.', 'warning');
      return;
    }
    showConfirm(
      'Eliminar Usuario',
      `¿Está seguro de eliminar al usuario "${username}"?`,
      async () => {
        try {
          const token = safeStorage.getItem('saved_session_token');
          const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Fallo al eliminar usuario');
          }

          setUserSuccessMessage('¡Usuario eliminado con éxito!');
          fetchSystemUsers();
          setTimeout(() => setUserSuccessMessage(''), 3000);
        } catch (err: any) {
          showAlert('Error al Eliminar', err.message, 'danger');
        }
      },
      'danger'
    );
  };

  // Test states and helper functions for AI Providers connectivity
  const [testStatuses, setTestStatuses] = useState<Record<string, { status: 'idle' | 'testing' | 'success' | 'error'; errorMsg?: string; respuesta?: string }>>({});
  const [testingAll, setTestingAll] = useState(false);

  const testSingleProvider = async (id: string, customKey?: string) => {
    setTestStatuses(prev => ({
      ...prev,
      [id]: { status: 'testing' }
    }));

    try {
      const keyVal = customKey !== undefined ? customKey : (editKeys[id] !== undefined ? editKeys[id] : DEFAULT_KEYS[id]);
      const token = safeStorage.getItem('saved_session_token');

      const response = await fetch(`/api/providers/${id}/test`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ apiKey: keyVal || undefined })
      });

      const result = await response.json();
      if (!response.ok || result.success === false) {
        setTestStatuses(prev => ({
          ...prev,
          [id]: { 
            status: 'error', 
            errorMsg: result.error || result.message || 'Falla de conexión o respuesta incorrecta.' 
          }
        }));
      } else {
        setTestStatuses(prev => ({
          ...prev,
          [id]: { 
            status: 'success', 
            respuesta: result.respuesta 
          }
        }));
      }
    } catch (err: any) {
      setTestStatuses(prev => ({
        ...prev,
        [id]: { 
          status: 'error', 
          errorMsg: err.message || 'Error de red.' 
        }
      }));
    }
  };

  const testAllProviders = async () => {
    setTestingAll(true);
    // Filter and run tests in parallel for providers that are configured or are Google Gemini fallback
    const promises = localProviders.map(prov => {
      const isConfigured = prov.hasKey || !!editKeys[prov.id];
      if (isConfigured) {
        return testSingleProvider(prov.id);
      }
      return Promise.resolve();
    });

    await Promise.all(promises);
    setTestingAll(false);
  };

  // Filtered recipients
  const filteredRecipients = recipients.filter(r => {
    const matchesSearch = r.nombre.toLowerCase().includes(recSearch.toLowerCase()) || 
      r.cargo.toLowerCase().includes(recSearch.toLowerCase());
    const matchesArea = !recFilterAreaId || r.areaId === recFilterAreaId;
    return matchesSearch && matchesArea;
  });

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 font-sans" id="config_view_root">
      
      {/* Upper header */}
      <div className="border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Configuraciones
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Administre el directorio de destinatarios, áreas, usuarios, proveedores de IA y configuración del sistema.
        </p>
      </div>

      {/* Sub tabs navigation */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('destinatarios')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'destinatarios'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-slate-900/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Users size={14} />
          <span>Directorio de Destinatarios</span>
        </button>

        {currentUser.role === 'Administrador' && (
          <>
            <button
              onClick={() => setActiveTab('areas')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'areas'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-slate-900/40 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Network size={14} />
              <span>Gestión de Áreas</span>
            </button>

            <button
              onClick={() => setActiveTab('usuarios')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'usuarios'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-slate-900/40 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <UserCheck size={14} />
              <span>Gestión de Usuarios</span>
            </button>

            <button
              onClick={() => setActiveTab('ia')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'ia'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-slate-900/40 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Cpu size={14} />
              <span>Proveedores de IA</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'logs'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-slate-900/40 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <History size={14} />
              <span>Bitácora del Sistema</span>
            </button>
          </>
        )}
      </div>

      {/* Tab 1: Directorio de Destinatarios */}
      {activeTab === 'destinatarios' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/80 shadow-inner">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar destinatario por nombre o cargo..."
                value={recSearch}
                onChange={(e) => setRecSearch(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* Area filter */}
            <select
              value={recFilterAreaId}
              onChange={(e) => setRecFilterAreaId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="">Todas las áreas</option>
              {areasList.map((a: any) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            {/* Add recipient btn */}
            <button
              onClick={() => {
                setEditingRecipient(null);
                setNewRecName('');
                setNewRecCargo('');
                setNewRecAreaId('');
                setShowAddForm(!showAddForm);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all active:scale-95 shrink-0"
            >
              <Plus size={14} />
              <span>Nuevo Destinatario</span>
            </button>
          </div>

          {/* Add / Edit Form */}
          {(showAddForm || editingRecipient) && (
            <form 
              onSubmit={editingRecipient ? handleUpdateRecipient : handleAddRecipient}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-indigo-500/20 shadow-sm space-y-4 animate-fade-in"
            >
              <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {editingRecipient ? 'Editar Destinatario' : 'Registrar Nuevo Destinatario'}
                </h4>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingRecipient(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Nombre Completo</label>
                  <input 
                    type="text"
                    required
                    value={editingRecipient ? editingRecipient.nombre : newRecName}
                    onChange={(e) => {
                      if (editingRecipient) {
                        setEditingRecipient({ ...editingRecipient, nombre: e.target.value });
                      } else {
                        setNewRecName(e.target.value);
                      }
                    }}
                    placeholder="Ej. SR. TONY JHON FERNANDEZ DIAZ"
                    className="w-full px-3 py-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Cargo / Oficina</label>
                  <input 
                    type="text"
                    required
                    value={editingRecipient ? editingRecipient.cargo : newRecCargo}
                    onChange={(e) => {
                      if (editingRecipient) {
                        setEditingRecipient({ ...editingRecipient, cargo: e.target.value });
                      } else {
                        setNewRecCargo(e.target.value);
                      }
                    }}
                    placeholder="Ej. JEFE DEL ÁREA DE GESTIÓN INSTITUCIONAL"
                    className="w-full px-3 py-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Área / Oficina (Organigrama)</label>
                  <select
                    value={editingRecipient ? (editingRecipient.areaId || '') : newRecAreaId}
                    onChange={(e) => {
                      if (editingRecipient) {
                        setEditingRecipient({ ...editingRecipient, areaId: e.target.value || undefined });
                      } else {
                        setNewRecAreaId(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="">Sin área específica</option>
                    {areasList.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.parentAreaId ? `↳ ${a.name}` : a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingRecipient(null);
                  }}
                  className="px-3 py-1.5 rounded text-xs font-semibold text-slate-500 hover:bg-slate-200/50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  <Check size={12} />
                  <span>{editingRecipient ? 'Guardar Cambios' : 'Registrar'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Recipients List Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400">
                    <th className="p-3">Destinatario (Nombre)</th>
                    <th className="p-3">Cargo del Destinatario</th>
                    <th className="p-3">Área / Oficina</th>
                    <th className="p-3 text-right w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {filteredRecipients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400">
                        No hay destinatarios registrados que coincidan.
                      </td>
                    </tr>
                  ) : (
                    filteredRecipients.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-300 font-sans">
                        <td className="p-3 font-bold text-slate-900 dark:text-white uppercase">{rec.nombre}</td>
                        <td className="p-3 uppercase text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{rec.cargo}</td>
                        <td className="p-3">
                          {rec.areaId ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/10">
                              {areasList.find((a: any) => a.id === rec.areaId)?.name || rec.areaId}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">General</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setShowAddForm(false);
                                setEditingRecipient(rec);
                              }}
                              className="p-1.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteRecipient(rec.id)}
                              className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Proveedores de IA */}
      {activeTab === 'ia' && currentUser.role === 'Administrador' && (
        <div className="grid lg:grid-cols-12 gap-6 items-start animate-fade-in">
          
          {/* Left Side: Failure Simulator & Add Custom Provider Button */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-5 rounded-2xl bg-indigo-50/20 dark:bg-slate-900/40 border border-indigo-500/20 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-indigo-500" size={18} />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Simulador de Fallas (Fines de Demo)
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Active esta opción para simular de forma transparente bloqueos de API, límites de cuota agotados (429 Rate Limits) o errores 500 en los proveedores primarios. Esto le permitirá ver el sistema de conmutación automática de IA en tiempo real.
              </p>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-950 border border-indigo-500/10">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Fallas de API Controladas</span>
                <button 
                  onClick={handleToggleSimulation}
                  className="text-indigo-500 hover:text-indigo-600 transition-colors"
                  id="toggle_sim_btn"
                >
                  {simulateFailures ? <ToggleRight size={38} className="text-indigo-500" /> : <ToggleLeft size={38} className="text-slate-400" />}
                </button>
              </div>
            </div>

            {/* Registrar Nuevo Proveedor Custom UI Form Toggle */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus size={14} className="text-indigo-500" />
                  <span>Nuevos Proveedores (NVIDIA, etc.)</span>
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Registre APIs de IA compatibles con OpenAI (como NVIDIA NIM, Groq, Ollama u otras personalizadas) especificando un Endpoint URL personalizado.
              </p>

              {!showAddProviderForm ? (
                <button
                  type="button"
                  onClick={() => setShowAddProviderForm(true)}
                  className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all active:scale-[0.98]"
                >
                  + Agregar Nuevo Proveedor IA
                </button>
              ) : (
                <form onSubmit={handleAddCustomProvider} className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setNewProvId('nvidia');
                        setNewProvName('NVIDIA NIM');
                        setNewProvModelName('meta/llama-3.1-70b-instruct');
                        setNewProvApiUrl('https://integrate.api.nvidia.com/v1/chat/completions');
                      }}
                      className="px-2 py-1 text-[10px] font-semibold rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                    >
                      ⚡ Llenar NVIDIA NIM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewProvId('groq');
                        setNewProvName('Groq');
                        setNewProvModelName('llama-3.3-70b-versatile');
                        setNewProvApiUrl('https://api.groq.com/openai/v1/chat/completions');
                      }}
                      className="px-2 py-1 text-[10px] font-semibold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                    >
                      ⚡ Llenar Groq
                    </button>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">ID Único (ej: nvidia)</label>
                    <input 
                      type="text"
                      required
                      value={newProvId}
                      onChange={(e) => setNewProvId(e.target.value)}
                      placeholder="nvidia"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Nombre Visible (ej: NVIDIA Llama 3)</label>
                    <input 
                      type="text"
                      required
                      value={newProvName}
                      onChange={(e) => setNewProvName(e.target.value)}
                      placeholder="NVIDIA Llama 3"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Nombre del Modelo (ej: meta/llama-3.1-70b-instruct)</label>
                    <input 
                      type="text"
                      required
                      value={newProvModelName}
                      onChange={(e) => setNewProvModelName(e.target.value)}
                      placeholder="meta/llama-3.1-70b-instruct"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">API URL / Endpoint</label>
                    <input 
                      type="text"
                      value={newProvApiUrl}
                      onChange={(e) => setNewProvApiUrl(e.target.value)}
                      placeholder="https://integrate.api.nvidia.com/v1/chat/completions"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Clave API / API Key (Opcional)</label>
                    <input 
                      type="password"
                      value={newProvApiKey}
                      onChange={(e) => setNewProvApiKey(e.target.value)}
                      placeholder="nvapi-••••••••••••"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddProviderForm(false)}
                      className="px-2.5 py-1.5 rounded text-[11px] font-semibold text-slate-500 hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold"
                    >
                      Registrar
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Conmutación por Falla</h3>
              <div className="space-y-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                <p>
                  <strong>1. Prioridades:</strong> El sistema procesa de forma ascendente (Prioridad 1, luego 2, etc.). Use los botones de flecha para reorganizar el orden.
                </p>
                <p>
                  <strong>2. Claves Locales:</strong> Si no configura una clave propia, el sistema utilizará de forma transparente el servicio Google Gemini interno.
                </p>
              </div>
            </div>
          </div>

          {/* Right Side: Providers List */}
          <div className="lg:col-span-8 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Jerarquía de Proveedores de IA</h3>
                <p className="text-[10px] text-slate-400">Ordene los proveedores por prioridad y evalúe su estado de conexión en segundo plano.</p>
              </div>
              <button
                type="button"
                onClick={testAllProviders}
                disabled={testingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 border border-indigo-200/50 dark:border-indigo-900/60 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 transition-all active:scale-[0.98] self-end sm:self-auto shrink-0"
                title="Prueba silenciosa enviando 2+2 a todos los proveedores configurados"
              >
                <RefreshCw size={12} className={testingAll ? "animate-spin" : ""} />
                <span>Probar Todos (2+2)</span>
              </button>
            </div>

            <div className="space-y-3" id="providers_list">
              {localProviders.map((prov, index) => {
                const isFirst = index === 0;
                const isLast = index === localProviders.length - 1;
                const isKeyVisible = visibleKeys[prov.id];
                const editKeyVal = editKeys[prov.id] || '';
                const isEditingThis = editingProviderId === prov.id;

                return (
                  <div 
                    key={prov.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col items-stretch gap-4 ${
                      prov.enabled
                        ? 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800/80'
                        : 'bg-slate-100/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-500 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                          {prov.priority}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          {isEditingThis ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                              <div>
                                <label className="text-[9px] uppercase font-bold text-slate-400">Nombre Proveedor</label>
                                <input 
                                  type="text"
                                  value={prov.name}
                                  onChange={(e) => handleUpdateProviderField(prov.id, 'name', e.target.value)}
                                  className="w-full text-xs p-1 rounded bg-slate-50 dark:bg-slate-900 border"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase font-bold text-slate-400">Modelo Estándar</label>
                                <input 
                                  type="text"
                                  value={prov.modelName}
                                  onChange={(e) => handleUpdateProviderField(prov.id, 'modelName', e.target.value)}
                                  className="w-full text-xs p-1 rounded bg-slate-50 dark:bg-slate-900 border"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] uppercase font-bold text-slate-400">Endpoint API (Opcional)</label>
                                <input 
                                  type="text"
                                  value={prov.apiUrl || ''}
                                  onChange={(e) => handleUpdateProviderField(prov.id, 'apiUrl', e.target.value || undefined)}
                                  className="w-full text-xs p-1 rounded bg-slate-50 dark:bg-slate-900 border"
                                  placeholder="Predeterminado OpenAI"
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">{prov.name}</span>
                                <span className="text-[9px] font-mono text-slate-400 font-medium">({prov.modelName})</span>
                              </div>
                              {prov.apiUrl && (
                                <p className="text-[9px] font-mono text-slate-400 truncate mt-0.5">URL: {prov.apiUrl}</p>
                              )}
                            </div>
                          )}
                          
                              {(() => {
                                const displayVal = editKeyVal !== undefined ? editKeyVal : (prov.apiKey || DEFAULT_KEYS[prov.id] || '');
                                return (
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <input 
                                      type={isKeyVisible ? 'text' : 'password'}
                                      value={displayVal}
                                      onChange={(e) => handleKeyChange(prov.id, e.target.value)}
                                      placeholder="Ingrese API Key..."
                                      className="text-[10px] font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded outline-none text-slate-800 dark:text-slate-200 w-64"
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => toggleKeyVisibility(prov.id)}
                                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                      title="Mostrar/Ocultar Clave"
                                    >
                                      {isKeyVisible ? <EyeOff size={11} /> : <Eye size={11} />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => testSingleProvider(prov.id)}
                                      className="text-indigo-600 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded border border-indigo-500/20 transition-all"
                                      title="Probar conexión con esta clave enviando 2+2"
                                    >
                                      <Activity size={10} />
                                      <span>Probar</span>
                                    </button>
                                    <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                      ✓ Autolleno y Activo
                                    </span>
                                  </div>
                                );
                              })()}

                          {/* Diagnostic Test Status rendering */}
                          {testStatuses[prov.id] && (
                            <div className="mt-2 text-[11px] animate-fade-in">
                              {testStatuses[prov.id].status === 'testing' && (
                                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium font-mono text-[10px]">
                                  <RefreshCw size={11} className="animate-spin text-indigo-500" />
                                  <span>Verificando conexión en segundo plano (2+2 = ?)...</span>
                                </span>
                              )}
                              {testStatuses[prov.id].status === 'success' && (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15 font-mono text-[10px]">
                                  <Check size={11} />
                                  <span>Conexión Exitosa: 2+2 = {testStatuses[prov.id].respuesta}</span>
                                </span>
                              )}
                              {testStatuses[prov.id].status === 'error' && (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/15 font-mono text-[10px]">
                                    <AlertCircle size={11} />
                                    <span>Error en Carga / Conexión</span>
                                  </span>
                                  <p className="text-[10px] text-red-500/90 font-mono max-w-sm leading-tight pl-1">
                                    {testStatuses[prov.id].errorMsg}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right actions: Up/Down, Edit fields toggle, Active Toggle, Trash delete */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2 mr-1">
                          {prov.id !== 'gemini' && (
                            <button
                              type="button"
                              onClick={() => setEditingProviderId(isEditingThis ? null : prov.id)}
                              className={`p-1 rounded border text-[10px] font-bold ${
                                isEditingThis 
                                  ? 'bg-indigo-505 text-white bg-indigo-600 border-indigo-600 hover:bg-indigo-700' 
                                  : 'bg-white dark:bg-slate-950 border-slate-200 text-slate-500 hover:text-indigo-500'
                              }`}
                              title={isEditingThis ? "Cerrar edición" : "Editar Nombre/Modelo/URL"}
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                          <button 
                            type="button"
                            onClick={() => moveUp(index)}
                            disabled={isFirst}
                            className="p-1 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-500 disabled:opacity-30"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => moveDown(index)}
                            disabled={isLast}
                            className="p-1 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-500 disabled:opacity-30"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleEnabled(prov.id)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${
                            prov.enabled
                              ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/20'
                              : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-950 dark:border-slate-800 hover:bg-slate-200/50'
                          }`}
                        >
                          {prov.enabled ? 'ACTIVO' : 'INACTIVO'}
                        </button>

                        {prov.id !== 'gemini' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteProvider(prov.id, prov.name)}
                            className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                            title="Eliminar Proveedor de IA de la lista"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Consumo y Saldo Stats Bar */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                      <div className="flex items-center gap-4 text-slate-500">
                        <span className="flex items-center gap-1 font-medium">
                          <strong>Tokens Consumidos:</strong> {prov.tokensConsumed !== undefined ? prov.tokensConsumed.toLocaleString() : '0'} tokens
                        </span>
                        <span className="h-3 w-px bg-slate-200 dark:bg-slate-800"></span>
                        <span className="flex items-center gap-1 font-medium">
                          <strong>Costo Estimado:</strong> ${(prov.tokensConsumed ? (prov.tokensConsumed * 0.000002).toFixed(4) : '0.0000')} USD
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-slate-400 font-medium">Saldo Disponible:</span>
                        <span className={`px-2 py-0.5 rounded-full font-mono font-bold ${
                          (prov.balance !== undefined ? prov.balance : 10.00) <= 0.5 
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/10' 
                            : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10'
                        }`}>
                          ${(prov.balance !== undefined ? prov.balance : 10.00).toFixed(2)} USD
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              {success ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                  <Check size={14} />
                  <span>¡Prioridades, Atributos y Claves actualizadas con éxito!</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <AlertCircle size={12} />
                  <span>Las claves se guardan en el servidor mediante encripción básica.</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveProvidersConfig}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition-colors"
              >
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Aplicar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Gestión de Usuarios (Admin-Only) */}
      {activeTab === 'usuarios' && currentUser.role === 'Administrador' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/80 shadow-inner">
            {/* Search users */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar usuario por nombre de usuario o nombre completo..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* Add user btn */}
            <button
              onClick={() => {
                setEditingUser(null);
                setShowAddUserForm(!showAddUserForm);
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all active:scale-95 shrink-0"
            >
              <Plus size={14} />
              <span>Nuevo Usuario</span>
            </button>
          </div>

          {/* User Add / Edit Form */}
          {(showAddUserForm || editingUser) && (
            <form 
              onSubmit={editingUser ? handleUpdateUser : handleAddUser}
              className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-indigo-500/20 shadow-sm space-y-4 animate-fade-in"
            >
              <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {editingUser ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
                </h4>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddUserForm(false);
                    setEditingUser(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Usuario / DNI (Login)</label>
                  <input 
                    type="text"
                    required
                    disabled={editingUser?.username === 'admin'}
                    value={editingUser ? editingUser.username : newUserUsername}
                    onChange={(e) => {
                      if (editingUser) {
                        setEditingUser({ ...editingUser, username: e.target.value });
                      } else {
                        setNewUserUsername(e.target.value);
                      }
                    }}
                    placeholder="Ej. admin o DNI"
                    className="w-full px-3 py-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none disabled:opacity-50 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Nombre Completo</label>
                  <input 
                    type="text"
                    required
                    value={editingUser ? editingUser.name : newUserName}
                    onChange={(e) => {
                      if (editingUser) {
                        setEditingUser({ ...editingUser, name: e.target.value });
                      } else {
                        setNewUserName(e.target.value);
                      }
                    }}
                    placeholder="Ej. Sofía Castro"
                    className="w-full px-3 py-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Rol del Sistema</label>
                  <select
                    value={editingUser ? editingUser.role : newUserRole}
                    onChange={(e) => {
                      const selRole = e.target.value as any;
                      if (editingUser) {
                        setEditingUser({ ...editingUser, role: selRole });
                      } else {
                        setNewUserRole(selRole);
                      }
                    }}
                    className="w-full px-3 py-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Secretaria">Secretaria</option>
                    <option value="Jefe">Jefe de Área</option>
                    <option value="Consulta">Consulta Externa</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 block">Área(s) / Oficina(s) UGEL (Selección Múltiple)</label>
                  <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-1.5 bg-slate-50/50 dark:bg-slate-950/30">
                    {areasList.map((a: any) => {
                      const currentSelectedIds = editingUser 
                        ? (editingUser.areaIds || (editingUser.areaId ? [editingUser.areaId] : []))
                        : newUserAreaIds;
                      const isChecked = currentSelectedIds.includes(a.id);
                      
                      return (
                        <label key={a.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              let nextIds = [...currentSelectedIds];
                              if (checked) {
                                if (!nextIds.includes(a.id)) nextIds.push(a.id);
                              } else {
                                nextIds = nextIds.filter(id => id !== a.id);
                              }
                              if (editingUser) {
                                setEditingUser({ 
                                  ...editingUser, 
                                  areaIds: nextIds,
                                  areaId: nextIds[0] || '' // Sync fallback areaId
                                });
                              } else {
                                setNewUserAreaIds(nextIds);
                                setNewUserAreaId(nextIds[0] || ''); // Sync fallback
                              }
                            }}
                            className="rounded border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500/20"
                          />
                          <span className={a.parentAreaId ? "text-slate-500 ml-3" : "font-bold text-slate-700 dark:text-slate-200"}>
                            {a.parentAreaId ? `↳ ${a.name}` : a.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Condición</label>
                  <select
                    value={editingUser ? (editingUser.condicion || '') : newUserCondicion}
                    onChange={(e) => {
                      if (editingUser) {
                        setEditingUser({ ...editingUser, condicion: e.target.value || undefined });
                      } else {
                        setNewUserCondicion(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="">Seleccionar condición</option>
                    <option value="Director">Director</option>
                    <option value="Secretaria">Secretaria</option>
                    <option value="Especialista">Especialista</option>
                    <option value="Apoyo Administrativo">Apoyo Administrativo</option>
                    <option value="Jefe de Área">Jefe de Área</option>
                    <option value="Jefe de Oficina">Jefe de Oficina</option>
                    <option value="Asesor Legal">Asesor Legal</option>
                    <option value="Analista">Analista</option>
                    <option value="Coordinador">Coordinador</option>
                    <option value="Técnico">Técnico</option>
                    <option value="Practicante">Practicante</option>
                    <option value="Servicio Profesional">Servicio Profesional</option>
                    <option value="Vigilante">Vigilante</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Cargo Institucional (Firma)</label>
                  <input 
                    type="text"
                    value={editingUser ? (editingUser.cargo || '') : newUserCargo}
                    onChange={(e) => {
                      if (editingUser) {
                        setEditingUser({ ...editingUser, cargo: e.target.value });
                      } else {
                        setNewUserCargo(e.target.value);
                      }
                    }}
                    placeholder="Ej. Especialista en Finanzas, Jefa de ADM"
                    className="w-full px-3 py-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">
                    {editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña de Acceso'}
                  </label>
                  <input 
                    type="password"
                    required={!editingUser}
                    value={editingUser ? (editingUser.password || '') : newUserPassword}
                    onChange={(e) => {
                      if (editingUser) {
                        setEditingUser({ ...editingUser, password: e.target.value });
                      } else {
                        setNewUserPassword(e.target.value);
                      }
                    }}
                    placeholder={editingUser ? 'Vacío para no cambiar' : 'Contraseña'}
                    className="w-full px-3 py-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUserForm(false);
                    setEditingUser(null);
                  }}
                  className="px-3 py-1.5 rounded text-xs font-semibold text-slate-500 hover:bg-slate-200/50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  <Check size={12} />
                  <span>{editingUser ? 'Guardar Cambios' : 'Registrar'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Success toast / feedback */}
          {userSuccessMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 text-xs font-bold border border-emerald-500/10 animate-fade-in flex items-center gap-2">
              <Check size={14} />
              <span>{userSuccessMessage}</span>
            </div>
          )}

          {/* Users Table List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
            {usersLoading ? (
              <div className="p-12 text-center text-slate-500 text-xs font-mono">
                <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-indigo-500" />
                <span>Cargando directorio de usuarios...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400">
                      <th className="p-3">Usuario (Login / DNI)</th>
                      <th className="p-3">Nombre Completo</th>
                      <th className="p-3">Área / Oficina</th>
                      <th className="p-3">Cargo Institucional</th>
                      <th className="p-3">Condición</th>
                      <th className="p-3">Rol del Sistema</th>
                      <th className="p-3 text-right w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    {systemUsers
                      .filter(u => 
                        u.username.toLowerCase().includes(userSearch.toLowerCase()) || 
                        u.name.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-300 font-sans">
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{user.username}</td>
                          <td className="p-3 font-semibold uppercase">{user.name}</td>
                          <td className="p-3 font-medium text-slate-500 dark:text-slate-400">
                            {user.areaIds && user.areaIds.length > 0
                              ? user.areaIds.map(id => areasList.find(a => a.id === id)?.name).filter(Boolean).join(', ')
                              : (areasList.find(a => a.id === user.areaId)?.name || 'Externo / Ninguna')}
                          </td>
                          <td className="p-3 font-medium text-slate-500 dark:text-slate-400 italic">
                            {user.cargo || 'No especificado'}
                          </td>
                          <td className="p-3">
                            {user.condicion ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/15">
                                {user.condicion}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              user.role === 'Administrador'
                                ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/15'
                                : user.role === 'Jefe'
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/15'
                                : user.role === 'Secretaria'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15'
                                : 'bg-slate-500/10 text-slate-500 border border-slate-500/15'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setShowAddUserForm(false);
                                  setEditingUser({ ...user, password: '' });
                                }}
                                className="p-1.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.username)}
                                disabled={user.username === 'admin' || user.username === currentUser.username}
                                className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-30 disabled:hover:bg-red-500/10 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Gestión de Áreas (Admin-Only) */}
      {activeTab === 'areas' && currentUser.role === 'Administrador' && (
        <div className="grid lg:grid-cols-12 gap-6 items-start animate-fade-in font-sans">
          {/* Left: Tree Panel */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2.5 flex items-center gap-1.5">
              <Network size={14} className="text-indigo-500" />
              <span>Organigrama de Áreas</span>
            </h3>

            <div className="space-y-0.5 max-h-[500px] overflow-y-auto pr-1 text-xs">
              {((rootNodes: any[]) => {
                const renderNode = (node: any, depth: number): React.ReactNode[] => {
                  const hasChildren = node.children.length > 0;
                  const isExpanded = expandedNodes.has(node.area.id);
                  const isSelected = selectedAreaToEdit?.id === node.area.id;
                  const memberCount = systemUsers.filter(u => {
                    const uAreaIds = u.areaIds || (u.areaId ? [u.areaId] : []);
                    return uAreaIds.includes(node.area.id);
                  }).length;
                  const getIcon = () => {
                    if (depth === 0) return <Building size={14} className="text-amber-500 shrink-0" />;
                    if (node.area.name.includes('Oficina de Administración') || node.area.code === 'ADM') return <Layers size={14} className="text-sky-500 shrink-0" />;
                    if (node.area.name.includes('Asesoría Jurídica') || node.area.code === 'OAJ') return <ShieldAlert size={14} className="text-purple-500 shrink-0" />;
                    if (node.area.name.includes('Área') || depth === 1) return <FolderOpen size={14} className="text-indigo-500 shrink-0" />;
                    return <Folder size={14} className="text-slate-400 shrink-0" />;
                  };
                  const items: React.ReactNode[] = [];
                  items.push(
                    <div key={node.area.id} style={{ paddingLeft: `${depth * 18}px` }}
                      onClick={() => {
                        setSelectedAreaToEdit(node.area);
                        setAreaSuffix(node.area.suffix || '');
                        setAreaResponsableNombre(node.area.responsableNombre || '');
                        setAreaResponsableCargo(node.area.responsableCargo || '');
                        setAreaMembreteBase64(node.area.membreteBase64 || '');
                        const linked = systemUsers.filter(u => (u.areaIds || (u.areaId ? [u.areaId] : [])).includes(node.area.id)).map(u => u.id);
                        setAreaLinkedUserIds(linked);
                      }}
                      className={`flex items-center gap-1 py-1.5 px-2 rounded-lg cursor-pointer transition-all group ${
                        isSelected ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {hasChildren ? (
                        <span onClick={(e) => { e.stopPropagation(); setExpandedNodes(prev => { const next = new Set(prev); next.has(node.area.id) ? next.delete(node.area.id) : next.add(node.area.id); return next; }); }} className="shrink-0 text-slate-400 hover:text-slate-600 w-3.5 flex items-center justify-center">
                          {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        </span>
                      ) : (
                        <span className="w-3.5 shrink-0" />
                      )}
                      {getIcon()}
                      <span className={`truncate ${depth === 0 ? 'font-bold' : depth === 1 ? 'font-semibold' : ''}`}>
                        {node.area.name}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 ml-auto shrink-0">
                        {memberCount}
                      </span>
                    </div>
                  );
                  if (hasChildren && isExpanded) {
                    items.push(...node.children.flatMap((child: any) => renderNode(child, depth + 1)));
                  }
                  return items;
                };
                return rootNodes.flatMap((node: any) => renderNode(node, 0));
              })(
                (() => {
                  const build = (parentId?: string): any[] => {
                    return areasList.filter(a => parentId ? a.parentAreaId === parentId : !a.parentAreaId).map(a => ({ area: a, children: build(a.id) }));
                  };
                  return build();
                })()
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <button type="button" onClick={() => { setShowCreateAreaForm(true); setNewAreaData({ id: '', name: '', code: '', parentAreaId: '' }); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold transition-all">
                <Plus size={12} /> <span>Nueva Área</span>
              </button>
            </div>

            {showCreateAreaForm && (
              <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2 animate-fade-in">
                <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Crear nueva área / oficina</div>
                <input type="text" placeholder="ID única (ej: oaj)" value={newAreaData.id} onChange={(e) => setNewAreaData(p => ({ ...p, id: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] focus:outline-none focus:border-indigo-500" />
                <input type="text" placeholder="Nombre (ej: Oficina de Asesoría Jurídica)" value={newAreaData.name} onChange={(e) => setNewAreaData(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] focus:outline-none focus:border-indigo-500" />
                <input type="text" placeholder="Código (ej: OAJ)" value={newAreaData.code} onChange={(e) => setNewAreaData(p => ({ ...p, code: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] focus:outline-none focus:border-indigo-500" />
                <select value={newAreaData.parentAreaId} onChange={(e) => setNewAreaData(p => ({ ...p, parentAreaId: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] focus:outline-none focus:border-indigo-500">
                  <option value="">Depende de: Dirección UGEL (raíz)</option>
                  {areasList.filter(a => !a.parentAreaId || a.parentAreaId === 'dir').map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={async () => {
                    if (!newAreaData.id || !newAreaData.name || !newAreaData.code) { showAlert('Campos Incompletos', 'ID, nombre y código son obligatorios.', 'warning'); return; }
                    try {
                      const token = safeStorage.getItem('saved_session_token');
                      const res = await fetch('/api/areas', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(newAreaData)
                      });
                      if (res.ok) {
                        const created = await res.json();
                        setAreasList(prev => [...prev, created]);
                        setExpandedNodes(prev => { const next = new Set(prev); if (newAreaData.parentAreaId) next.add(newAreaData.parentAreaId); next.add('dir'); return next; });
                        setShowCreateAreaForm(false);
                        showAlert('Área Creada', `"${created.name}" creada con éxito.`, 'success');
                      } else {
                        const err = await res.json();
                        showAlert('Error', err.error || 'No se pudo crear.', 'danger');
                      }
                    } catch (err: any) { showAlert('Error de Red', err.message, 'danger'); }
                  }} className="flex-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold transition-all">
                    Crear
                  </button>
                  <button type="button" onClick={() => setShowCreateAreaForm(false)} className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold transition-all">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Edit Panel */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2.5 flex items-center gap-2">
              {selectedAreaToEdit ? (
                <><span>{selectedAreaToEdit.name}</span><span className="text-[9px] font-mono text-slate-400 font-normal">({selectedAreaToEdit.code})</span></>
              ) : 'Seleccione un área del organigrama'}
            </h3>

            {selectedAreaToEdit ? (
              <div className="space-y-4">
                <div className="flex gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                  {selectedAreaToEdit.id !== 'dir' && (
                    <button type="button" onClick={() => {
                      if (confirm(`¿Eliminar "${selectedAreaToEdit.name}"?\nTambién se eliminarán sus sub-áreas.`)) {
                        fetch(`/api/areas/${selectedAreaToEdit.id}`, {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${safeStorage.getItem('saved_session_token')}` }
                        }).then(async (res) => {
                          if (res.ok) {
                            setAreasList(prev => prev.filter(a => a.id !== selectedAreaToEdit.id && a.parentAreaId !== selectedAreaToEdit.id));
                            setSelectedAreaToEdit(null);
                            fetchSystemUsers();
                            showAlert('Área Eliminada', 'El área fue eliminada con éxito.', 'success');
                          } else { const err = await res.json(); showAlert('Error', err.error || 'No se pudo eliminar.', 'danger'); }
                        }).catch(() => {});
                      }
                    }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold transition-all">
                      <Trash2 size={12} /> <span>Eliminar</span>
                    </button>
                  )}
                  <button type="button" onClick={() => { setShowCreateAreaForm(true); setNewAreaData({ id: '', name: '', code: '', parentAreaId: selectedAreaToEdit.id }); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold transition-all">
                    <Plus size={12} /> <span>Crear Sub-área</span>
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Código</label>
                    <input type="text" value={selectedAreaToEdit.code} disabled className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500 cursor-not-allowed" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Sufijo de numeración</label>
                    <input type="text" value={areaSuffix} onChange={(e) => setAreaSuffix(e.target.value)} placeholder="-2026-UGEL-ADM"
                      className="w-full px-3 py-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Responsable (Nombre)</label>
                    <input type="text" value={areaResponsableNombre} onChange={(e) => setAreaResponsableNombre(e.target.value)} placeholder="TONY JHON FERNANDEZ DIAZ"
                      className="w-full px-3 py-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Cargo del Responsable</label>
                    <input type="text" value={areaResponsableCargo} onChange={(e) => setAreaResponsableCargo(e.target.value)} placeholder="Jefe del Área de Gestión Institucional"
                      className="w-full px-3 py-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500 block">Membrete / Encabezado</label>
                  {areaMembreteBase64 ? (
                    <div className="space-y-2">
                      <div className="p-3 border border-slate-200/60 dark:border-slate-800/80 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                        <img src={areaMembreteBase64} alt="Membrete" className="max-h-16 w-full object-contain mx-auto rounded" />
                      </div>
                      <button type="button" onClick={() => setAreaMembreteBase64('')} className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-100 dark:border-rose-900/40 transition-colors">Quitar membrete</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/40">
                      <Upload size={20} className="text-slate-400 mb-1" />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 text-center mb-2">Subir membrete (PNG/JPG)</span>
                      <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = (evt) => { if (evt.target?.result) setAreaMembreteBase64(evt.target.result as string); }; r.readAsDataURL(f); } }} className="hidden" id="area-membrete-input" />
                      <label htmlFor="area-membrete-input" className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 cursor-pointer shadow-sm transition-colors">Seleccionar Archivo</label>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase text-slate-500 block">Miembros de {selectedAreaToEdit.name}</label>
                  {systemUsers.filter(u => areaLinkedUserIds.includes(u.id)).length > 0 ? (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead><tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-500">
                          <th className="p-2">Nombre</th><th className="p-2">Condición</th><th className="p-2">Cargo</th><th className="p-2 w-10"></th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                          {systemUsers.filter(u => areaLinkedUserIds.includes(u.id)).map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-300">
                              <td className="p-2 font-bold text-slate-900 dark:text-white uppercase text-[10px]">{u.name}</td>
                              <td className="p-2">
                                <select value={u.condicion || ''} onChange={async (e) => {
                                  const v = e.target.value;
                                  setSystemUsers((prev: any) => prev.map((su: any) => su.id === u.id ? { ...su, condicion: v || undefined } : su));
                                  try { await fetch(`/api/users/${u.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${safeStorage.getItem('saved_session_token')}` }, body: JSON.stringify({ ...u, condicion: v || undefined }) }); fetchSystemUsers(); } catch (err) { console.error(err); }
                                }} className="w-full px-2 py-1 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] focus:outline-none">
                                  <option value="">Seleccionar</option>
                                  <option value="Director">Director</option>
                                  <option value="Secretaria">Secretaria</option>
                                  <option value="Especialista">Especialista</option>
                                  <option value="Apoyo Administrativo">Apoyo Administrativo</option>
                                  <option value="Jefe de Área">Jefe de Área</option>
                                  <option value="Jefe de Oficina">Jefe de Oficina</option>
                                  <option value="Asesor Legal">Asesor Legal</option>
                                  <option value="Analista">Analista</option>
                                  <option value="Coordinador">Coordinador</option>
                                  <option value="Técnico">Técnico</option>
                                  <option value="Practicante">Practicante</option>
                                  <option value="Servicio Profesional">Servicio Profesional</option>
                                  <option value="Vigilante">Vigilante</option>
                                  <option value="Otro">Otro</option>
                                </select>
                              </td>
                              <td className="p-2 text-[10px] text-slate-500 italic">{u.cargo || '—'}</td>
                              <td className="p-2">
                                <button onClick={() => {
                                  setAreaLinkedUserIds(prev => prev.filter(id => id !== u.id));
                                  fetch(`/api/users/${u.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${safeStorage.getItem('saved_session_token')}` }, body: JSON.stringify({ ...u, areaIds: (u.areaIds || []).filter((id: string) => id !== selectedAreaToEdit?.id) }) }).then(() => fetchSystemUsers()).catch(() => {});
                                }} className="p-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" title="Desvincular"><X size={11} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 italic bg-slate-50 dark:bg-slate-950/30 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">No hay miembros asignados.</div>
                  )}

                  <details className="group">
                    <summary className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">+ Agregar miembros</summary>
                    <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/30">
                      <div className="p-2 border-b border-slate-200 dark:border-slate-800">
                        <input type="text" placeholder="Buscar por nombre o DNI..." value={searchMemberQuery} onChange={(e) => setSearchMemberQuery(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors" />
                      </div>
                      <div className="max-h-48 overflow-y-auto p-3 space-y-1.5">
                        {(() => {
                          const filtered = systemUsers.filter(u => !areaLinkedUserIds.includes(u.id)).filter(u => {
                            if (!searchMemberQuery) return true;
                            const q = searchMemberQuery.toLowerCase();
                            return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
                          });
                          return filtered.length > 0 ? filtered.map((u: any) => (
                            <label key={u.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none hover:bg-white dark:hover:bg-slate-900 p-1.5 rounded transition-colors">
                              <input type="checkbox" checked={false} onChange={(e) => {
                                if (e.target.checked) {
                                  setAreaLinkedUserIds(prev => [...prev, u.id]);
                                  fetch(`/api/users/${u.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${safeStorage.getItem('saved_session_token')}` }, body: JSON.stringify({ ...u, areaIds: [...(u.areaIds || (u.areaId ? [u.areaId] : [])), selectedAreaToEdit!.id] }) }).then(() => fetchSystemUsers()).catch(() => {});
                                }
                              }} className="rounded border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500/20" />
                              <span className="font-bold text-slate-700 dark:text-slate-200 uppercase">{u.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({u.username} - {u.role})</span>
                            </label>
                          )) : <div className="text-[10px] text-slate-400 italic">Todos los usuarios ya están asignados.</div>;
                        })()}
                      </div>
                    </div>
                  </details>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <button type="button" onClick={async () => {
                    try {
                      const token = safeStorage.getItem('saved_session_token');
                      const response = await fetch(`/api/areas/${selectedAreaToEdit.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ suffix: areaSuffix.trim(), responsableNombre: areaResponsableNombre.trim(), responsableCargo: areaResponsableCargo.trim(), membreteBase64: areaMembreteBase64, userIds: areaLinkedUserIds })
                      });
                      if (response.ok) {
                        const updated = await response.json();
                        setAreasList((prev: any) => prev.map((a: any) => a.id === updated.id ? updated : a));
                        setSelectedAreaToEdit(updated);
                        fetchSystemUsers();
                        showAlert('Guardado', `"${updated.name}" actualizada.`, 'success');
                      } else { const err = await response.json(); showAlert('Error', err.error || 'No se pudo guardar.', 'danger'); }
                    } catch (err: any) { showAlert('Error de Red', err.message, 'danger'); }
                  }} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all">
                    <Check size={12} /> <span>Guardar Cambios</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">Seleccione un área del organigrama para configurar sus firmas, membrete y miembros.</div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Bitácora del Sistema */}
      {activeTab === 'logs' && currentUser.role === 'Administrador' && (
        <div className="animate-fade-in">
          <LogsView logs={logs} />
        </div>
      )}

      {/* Custom Modal Overlay */}
      {customModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" id="custom_modal_overlay">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                customModal.type === 'danger' 
                  ? 'bg-red-500/10 text-red-500' 
                  : customModal.type === 'warning' 
                  ? 'bg-amber-500/10 text-amber-500' 
                  : customModal.type === 'success' 
                  ? 'bg-emerald-500/10 text-emerald-500' 
                  : 'bg-indigo-500/10 text-indigo-500'
              }`}>
                {customModal.type === 'danger' && <Trash2 size={20} />}
                {customModal.type === 'warning' && <AlertTriangle size={20} />}
                {customModal.type === 'success' && <Check size={20} />}
                {customModal.type === 'info' && <Info size={20} />}
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {customModal.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {customModal.message}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              {customModal.cancelText && (
                <button
                  type="button"
                  onClick={customModal.onCancel}
                  className="px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold transition-all"
                >
                  {customModal.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={customModal.onConfirm}
                className={`px-4 py-2 rounded-lg text-white text-xs font-semibold shadow transition-all ${
                  customModal.type === 'danger'
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/10'
                    : customModal.type === 'warning'
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/10'
                }`}
              >
                {customModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
