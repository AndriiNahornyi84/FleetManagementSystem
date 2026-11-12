import React, { useState } from 'react';
import {
  Settings,
  Building2,
  BellRing,
  RotateCcw,
  Save,
  CheckCircle,
  Shield,
  Info,
  Server
} from 'lucide-react';
import { CompanySettings } from '../types/fleet.js';
import { Modal } from '../components/Modal.js';
import { useI18n } from '../i18n/I18nContext.js';

interface SettingsPageProps {
  settings: CompanySettings | null;
  onRefresh: () => void;
  onShowToast: (type: 'success' | 'error' | 'warning', msg: string) => void;
  api: any;
}

export function SettingsPage({
  settings,
  onRefresh,
  onShowToast,
  api
}: SettingsPageProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    companyName: settings?.companyName || 'LogiTrans s.r.o.',
    address: settings?.address || 'Priemyselná 12, 040 01 Košice, Slovensko',
    ico: settings?.ico || '47281903',
    dic: settings?.dic || '2023819401',
    icDph: settings?.icDph || 'SK2023819401',
    email: settings?.email || 'dispecing@logitrans.sk',
    phone: settings?.phone || '+421 55 678 1234',
    currency: settings?.currency || 'EUR',
    alertDaysWarning: settings?.alertDaysWarning || 30,
    alertDaysCritical: settings?.alertDaysCritical || 7
  });

  const [saving, setSaving] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings(formData);
      onShowToast('success', t('settings.saved'));
      onRefresh();
    } catch (err: any) {
      onShowToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDemo = async () => {
    setRestoring(true);
    try {
      await api.restoreDemoData();
      onShowToast('success', 'Demonštračné údaje (10 vozidiel, 6 vodičov, tankovania a servis) boli obnovené.');
      setIsRestoreModalOpen(false);
      onRefresh();
    } catch (err: any) {
      onShowToast('error', err.message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          {t('page.settings.title')}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Správa firemných identifikačných údajov, nastavenie lehotových limitov a správa databázy.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Info Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              {t('page.companyInfo')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('page.companyName')}</label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('page.address')}</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">IČO</label>
              <input
                type="text"
                value={formData.ico}
                onChange={(e) => setFormData({ ...formData, ico: e.target.value })}
                className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('page.taxId')}</label>
              <input
                type="text"
                value={formData.icDph}
                onChange={(e) => setFormData({ ...formData, icDph: e.target.value })}
                className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('page.contactEmail')}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('page.phone')}</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Notifications & Alert Thresholds */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <BellRing className="w-4 h-4 text-amber-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              {t('page.alertConfig')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Predstih bežného upozornenia (dni pred termínom STK/EK/PZP)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={formData.alertDaysWarning}
                onChange={(e) => setFormData({ ...formData, alertDaysWarning: Number(e.target.value) })}
                className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Štandardne 30 dní pred exspiráciou</span>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Kritické upozornenie (dni pred termínom)
              </label>
              <input
                type="number"
                min="1"
                max="14"
                value={formData.alertDaysCritical}
                onChange={(e) => setFormData({ ...formData, alertDaysCritical: Number(e.target.value) })}
                className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Červené varovanie (štandardne 7 dní)</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? t('settings.saving') : t('settings.save')}</span>
          </button>
        </div>
      </form>

      {/* Database Management & Demo Data Reset */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Server className="w-4 h-4 text-slate-600" />
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            {t('page.database')}
          </h2>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          V prípade potreby môžete kedykoľvek obnoviť počiatočný kompletný stav databázy: 10 slovenských vozidiel, 6 vodičov, reálne záznamy tankovania, servisu a technických kontrol.
        </p>

        <button
          type="button"
          onClick={() => setIsRestoreModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4 text-amber-600" />
          <span>{t('page.restoreDemo')}</span>
        </button>
      </div>

      {/* System Information Card */}
      <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <Info className="w-4 h-4 text-blue-600" />
          <span>{t('page.projectInfo')}</span>
        </div>
        <p className="leading-relaxed">
          Webová aplikácia na riadenie a monitorovanie vozového parku (Fleet Management System). Praktická časť diplomovej práce pre modelové logistické podniky v prostredí Slovenskej republiky.
        </p>
        <div className="flex flex-wrap gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-200 font-mono">
          <span>Verzia: 2.4-enterprise</span>
          <span>Databáza: SQLite (WAL Mode, ACID)</span>
          <span>Lokalizácia: sk-SK (Europe/Bratislava)</span>
          <span>Mena: EUR (€)</span>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        title={t('settings.restoreTitle')}
        subtitle="Všetky existujúce záznamy budú nahradené čistou štruktúrou 10 vozidiel a 6 vodičov."
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Naozaj si želáte preinštalovať vzorové údaje pre LogiTrans s.r.o.? Táto akcia vymaže manuálne zmeny a nastaví databázu do pôvodného stavu.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsRestoreModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              {t('page.cancel')}
            </button>
            <button
              onClick={handleRestoreDemo}
              disabled={restoring}
              className="px-3.5 py-1.5 text-white bg-amber-600 hover:bg-amber-700 rounded-lg font-semibold disabled:opacity-50"
            >
              {restoring ? t('settings.saving') : t('settings.restoreConfirm')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
