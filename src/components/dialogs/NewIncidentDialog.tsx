/**
 * Formulario para registrar un incidente a mano.
 *
 * No todo llega por una alerta automática: una llamada sospechosa o un aviso
 * de un proveedor los registra una persona. El caso entra abierto, con la
 * severidad que eligió quien lo reporta, y a partir de ahí es un incidente
 * como cualquier otro — cuenta en los indicadores, aparece en el tablero y
 * corre su plazo.
 *
 * Es un `<form>` real: Enter envía, el botón principal es `type="submit"` y el
 * único campo obligatorio usa `required`, así la validación la hace el
 * navegador con su propio mensaje y su propio foco.
 */

import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { CONTROL_CLASS } from '@/components/ui/control';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import type { IncidentDraft } from '@/data/store';
import { TEAM } from '@/data/team';
import { ASSET_NAMES } from '@/data/templates';
import { ASSET_KIND_LABEL, CATEGORY_OPTIONS, SEVERITY_OPTIONS } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { formatDurationFromHours } from '@/lib/format';
import { SLA_HOURS } from '@/lib/sla';
import type { AffectedAsset, IncidentCategory, Severity } from '@/types';

type AssetKind = AffectedAsset['kind'];

const ASSET_KINDS: readonly AssetKind[] = ['server', 'endpoint', 'account', 'service', 'network'];

/** Todos los activos del inventario, con el tipo que les corresponde. */
const ASSETS: readonly AffectedAsset[] = ASSET_KINDS.flatMap((kind) =>
  ASSET_NAMES[kind].map((name) => ({ id: `${kind}-${name}`, name, kind })),
);

const DEFAULT_DESCRIPTION = 'Incidente registrado manualmente desde la consola.';

interface NewIncidentDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /** Quién registra: firma la bitácora y es el responsable por defecto. */
  readonly me: string;
  readonly onCreate: (draft: IncidentDraft) => void;
}

interface FormProps {
  readonly me: string;
  readonly onCancel: () => void;
  readonly onCreate: (draft: IncidentDraft) => void;
}

/**
 * El formulario vive en un componente aparte, que `Modal` sólo monta mientras
 * está abierto: así cada apertura arranca con los campos limpios sin tener que
 * reiniciar el estado a mano.
 */
function NewIncidentForm({ me, onCancel, onCreate }: FormProps) {
  const id = useId();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [category, setCategory] = useState<IncidentCategory>('phishing');
  const [assignee, setAssignee] = useState(me);
  const [assetId, setAssetId] = useState(ASSETS[0]?.id ?? '');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const asset = ASSETS.find((candidate) => candidate.id === assetId);
    const trimmedTitle = title.trim();
    if (asset === undefined || trimmedTitle === '') return;

    onCreate({
      title: trimmedTitle,
      description: description.trim() === '' ? DEFAULT_DESCRIPTION : description.trim(),
      severity,
      category,
      assignee,
      asset,
      reporter: me,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Título" htmlFor={`${id}-titulo`}>
        <input
          id={`${id}-titulo`}
          type="text"
          required
          data-autofocus
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Qué pasó, en una línea"
          className={cn(CONTROL_CLASS, 'h-10')}
        />
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold text-text-secondary">Severidad</legend>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {SEVERITY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer flex-col gap-0.5 rounded-control border px-3 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus-ring)',
                severity === option.value
                  ? option.badgeClassName
                  : 'border-border-subtle text-text-secondary hover:border-border-strong',
              )}
            >
              <input
                type="radio"
                name={`${id}-severidad`}
                value={option.value}
                checked={severity === option.value}
                onChange={() => setSeverity(option.value)}
                className="sr-only"
              />
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <span
                  aria-hidden="true"
                  className={cn('size-1.5 rounded-pill', option.dotClassName)}
                />
                {option.label}
              </span>
              <span className="text-[0.6875rem] opacity-80">
                Plazo {formatDurationFromHours(SLA_HOURS[option.value])}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Categoría" htmlFor={`${id}-categoria`}>
          <select
            id={`${id}-categoria`}
            value={category}
            onChange={(event) => {
              const match = CATEGORY_OPTIONS.find((option) => option.value === event.target.value);
              if (match !== undefined) setCategory(match.value);
            }}
            className={cn(CONTROL_CLASS, 'h-10')}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Responsable" htmlFor={`${id}-responsable`}>
          <select
            id={`${id}-responsable`}
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
            className={cn(CONTROL_CLASS, 'h-10')}
          >
            {TEAM.map((analyst) => (
              <option key={analyst.name} value={analyst.name}>
                {analyst.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Activo afectado" htmlFor={`${id}-activo`}>
        <select
          id={`${id}-activo`}
          value={assetId}
          onChange={(event) => setAssetId(event.target.value)}
          className={cn(CONTROL_CLASS, 'h-10 font-mono')}
        >
          {ASSET_KINDS.map((kind) => (
            <optgroup key={kind} label={ASSET_KIND_LABEL[kind]}>
              {ASSETS.filter((asset) => asset.kind === kind).map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>

      <Field
        label="Descripción"
        htmlFor={`${id}-descripcion`}
        hint="Opcional. Lo que se sabe hasta ahora y cómo se detectó."
      >
        <textarea
          id={`${id}-descripcion`}
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={cn(CONTROL_CLASS, 'resize-none py-2')}
        />
      </Field>

      <div className="mt-1 flex flex-wrap justify-end gap-2">
        <Button onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary">
          Registrar incidente
        </Button>
      </div>
    </form>
  );
}

export function NewIncidentDialog({ open, onClose, me, onCreate }: NewIncidentDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo incidente"
      description="Entra abierto y empieza a correr su plazo de inmediato."
    >
      <NewIncidentForm me={me} onCancel={onClose} onCreate={onCreate} />
    </Modal>
  );
}
