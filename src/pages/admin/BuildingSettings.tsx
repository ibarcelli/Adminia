import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../../components/AuthProvider'
import { useBuilding } from '../../hooks/useBuilding'
import type { BuildingFormData } from '../../hooks/useBuilding'
import { useUnits } from '../../hooks/useUnits'
import { Breadcrumb } from '../../components/ui/Breadcrumb'
import type { BankAccountType, WaterMeteringType } from '../../types/database'

export function BuildingSettings() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthContext()
  const isNew = id === 'new'
  const buildingId = isNew ? null : (id ?? null)

  const { building, loading: bLoading, error: bError, createBuilding, updateBuilding, deleteBuilding } = useBuilding(buildingId)
  const { units, loading: uLoading, error: uError, totalUnits, totalArea, addUnit, updateUnit, toggleActive } = useUnits(buildingId)

  // Building form state
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [bankType, setBankType] = useState<BankAccountType>('adminia')
  const [bankName, setBankName] = useState('')
  const [deadlineDay, setDeadlineDay] = useState(15)
  const [waterType, setWaterType] = useState<WaterMeteringType>('general')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')

  // Unit add form
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [newUnitNumber, setNewUnitNumber] = useState('')
  const [newAreaSqm, setNewAreaSqm] = useState('')
  const [newOwnerName, setNewOwnerName] = useState('')
  const [newOwnerEmail, setNewOwnerEmail] = useState('')
  const [newOwnerPhone, setNewOwnerPhone] = useState('')

  // Sync form with building data
  useEffect(() => {
    if (building) {
      setName(building.name)
      setAddress(building.address)
      setBankType(building.bank_account_type)
      setBankName(building.bank_account_name)
      setDeadlineDay(building.payment_deadline_day)
      setWaterType(building.water_metering_type)
    }
  }, [building])

  async function handleSaveBuilding() {
    setFormError('')
    setFormSuccess('')

    if (!name.trim()) { setFormError('El nombre es obligatorio.'); return }
    if (!address.trim()) { setFormError('La dirección es obligatoria.'); return }
    if (deadlineDay < 1 || deadlineDay > 28) { setFormError('El día límite debe ser entre 1 y 28.'); return }

    const data: BuildingFormData = {
      name: name.trim(),
      address: address.trim(),
      bank_account_type: bankType,
      bank_account_name: bankName.trim(),
      payment_deadline_day: deadlineDay,
      water_metering_type: waterType,
    }

    setSaving(true)

    if (isNew) {
      if (!profile?.organization_id) { setFormError('No se encontró la organización.'); setSaving(false); return }
      const newId = await createBuilding(profile.organization_id, data)
      setSaving(false)
      if (newId) {
        setFormSuccess('Edificio creado. Ahora puedes agregar departamentos.')
        navigate(`/admin/buildings/${newId}/settings`, { replace: true })
      } else {
        setFormError('Error al crear el edificio. Revisa los datos e intenta de nuevo.')
      }
      return
    }

    if (buildingId) {
      const ok = await updateBuilding(buildingId, data)
      setSaving(false)
      if (ok) setFormSuccess('Cambios guardados.')
      else setFormError('Error al guardar los cambios.')
      return
    }

    setSaving(false)
  }

  async function handleAddUnit() {
    setFormError('')
    if (!newUnitNumber.trim()) { setFormError('El número de departamento es obligatorio.'); return }
    const area = parseFloat(newAreaSqm)
    if (isNaN(area) || area <= 0) { setFormError('El área (m²) debe ser mayor a 0.'); return }

    setSaving(true)
    const ok = await addUnit({
      unit_number: newUnitNumber.trim(),
      area_sqm: area,
      owner_name: newOwnerName.trim(),
      owner_email: newOwnerEmail.trim(),
      owner_phone: newOwnerPhone.trim() || null,
    })

    if (ok) {
      setNewUnitNumber('')
      setNewAreaSqm('')
      setNewOwnerName('')
      setNewOwnerEmail('')
      setNewOwnerPhone('')
      setShowAddUnit(false)
    }
    setSaving(false)
  }

  if (bLoading) return <div className="p-8"><p className="text-slate-500">Cargando...</p></div>

  return (
    <div className="p-8 max-w-4xl">
      <Breadcrumb buildingId={buildingId ?? undefined} buildingName={building?.name} currentPage="Configuración" />
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        {isNew ? 'Nuevo edificio' : `${building?.name ?? 'Edificio'} — Configuración`}
      </h1>

      {(bError || uError) && <p className="text-red-600 text-sm mb-4">{bError || uError}</p>}

      {/* Section 1: Building data */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 mb-6">
        <h2 className="text-lg font-semibold text-slate-800">Datos del edificio</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Residencial Los Olivos" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección *</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Av. Universitaria 1234, Lima" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de cuenta bancaria</label>
            <select value={bankType} onChange={(e) => setBankType(e.target.value as BankAccountType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="own">Cuenta propia</option>
              <option value="adminia">Cuenta Adminia</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de cuenta bancaria</label>
            <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="BCP Cta. 191-123456-0-01" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Día límite de pago (1-28)</label>
            <input type="number" value={deadlineDay} onChange={(e) => setDeadlineDay(parseInt(e.target.value) || 15)}
              min={1} max={28}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de medidor de agua</label>
            <select value={waterType} onChange={(e) => setWaterType(e.target.value as WaterMeteringType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="general">Medidor general</option>
              <option value="individual">Medidores individuales</option>
            </select>
          </div>
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}
        {formSuccess && <p className="text-sm text-green-600">{formSuccess}</p>}

        <button onClick={handleSaveBuilding} disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando...' : isNew ? 'Crear edificio' : 'Guardar cambios'}
        </button>
      </div>

      {/* Section 2: Units (only if building exists) */}
      {!isNew && buildingId && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Departamentos</h2>
            <button onClick={() => setShowAddUnit(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
              + Agregar
            </button>
          </div>

          {uLoading ? (
            <p className="text-slate-500 text-sm">Cargando departamentos...</p>
          ) : units.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No hay departamentos registrados.</p>
              <p className="text-sm mt-1">Agrega el primer departamento para empezar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-2 font-medium text-slate-600">Número</th>
                    <th className="text-right py-2 px-2 font-medium text-slate-600">m²</th>
                    <th className="text-left py-2 px-2 font-medium text-slate-600">Propietario</th>
                    <th className="text-left py-2 px-2 font-medium text-slate-600">Email</th>
                    <th className="text-left py-2 px-2 font-medium text-slate-600 hidden sm:table-cell">Teléfono</th>
                    <th className="text-center py-2 px-2 font-medium text-slate-600">Activo</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit) => (
                    <UnitRow key={unit.id} unit={unit} onUpdate={updateUnit} onToggle={toggleActive} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add unit form */}
          {showAddUnit && (
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <p className="text-sm font-medium text-slate-600">Nuevo departamento</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <input type="text" value={newUnitNumber} onChange={(e) => setNewUnitNumber(e.target.value)}
                  placeholder="Número *" className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <input type="number" value={newAreaSqm} onChange={(e) => setNewAreaSqm(e.target.value)}
                  placeholder="m² *" step="0.01" className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <input type="text" value={newOwnerName} onChange={(e) => setNewOwnerName(e.target.value)}
                  placeholder="Propietario" className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <input type="email" value={newOwnerEmail} onChange={(e) => setNewOwnerEmail(e.target.value)}
                  placeholder="Email" className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <input type="text" value={newOwnerPhone} onChange={(e) => setNewOwnerPhone(e.target.value)}
                  placeholder="Teléfono" className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddUnit} disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Agregar'}
                </button>
                <button onClick={() => setShowAddUnit(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Summary */}
          {units.length > 0 && (
            <div className="border-t border-slate-200 pt-3 text-sm text-slate-500">
              {totalUnits} departamentos activos | Área total: {totalArea.toFixed(2)} m²
            </div>
          )}
        </div>
      )}

      {/* Section 3: Delete (only for existing buildings) */}
      {!isNew && buildingId && (
        <div className="bg-white border border-red-200 rounded-lg p-6 mt-6">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Zona de peligro</h2>
          <p className="text-sm text-slate-600 mb-4">
            Eliminar el edificio borrará todos los departamentos, periodos, estados de cuenta y registros asociados. Esta acción no se puede deshacer.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
          >
            Eliminar edificio
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && building && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setShowDeleteModal(false); setDeleteConfirmName('') }} />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Eliminar {building.name}</h3>
            <p className="text-sm text-slate-600 mb-4">
              Se eliminarán todos los departamentos, periodos, estados de cuenta y registros. No se puede deshacer.
            </p>
            <p className="text-sm text-slate-600 mb-2">Escribe <span className="font-semibold">{building.name}</span> para confirmar:</p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder={building.name}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmName('') }}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!buildingId) return
                  const ok = await deleteBuilding(buildingId)
                  if (ok) navigate('/admin', { replace: true })
                }}
                disabled={deleteConfirmName !== building.name}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// === Unit row with inline editing ===

function UnitRow({
  unit,
  onUpdate,
  onToggle,
}: {
  unit: { id: string; unit_number: string; area_sqm: number; owner_name: string; owner_email: string; owner_phone: string | null; is_active: boolean }
  onUpdate: (id: string, data: { unit_number: string; area_sqm: number; owner_name: string; owner_email: string; owner_phone: string | null }) => Promise<boolean>
  onToggle: (id: string, isActive: boolean) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [unitNumber, setUnitNumber] = useState(unit.unit_number)
  const [areaSqm, setAreaSqm] = useState(String(unit.area_sqm))
  const [ownerName, setOwnerName] = useState(unit.owner_name)
  const [ownerEmail, setOwnerEmail] = useState(unit.owner_email)
  const [ownerPhone, setOwnerPhone] = useState(unit.owner_phone ?? '')

  async function handleSave() {
    const area = parseFloat(areaSqm)
    if (!unitNumber.trim() || isNaN(area) || area <= 0) return

    await onUpdate(unit.id, {
      unit_number: unitNumber.trim(),
      area_sqm: area,
      owner_name: ownerName.trim(),
      owner_email: ownerEmail.trim(),
      owner_phone: ownerPhone.trim() || null,
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <tr className="border-b border-slate-100 bg-blue-50">
        <td className="py-1.5 px-2"><input type="text" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" /></td>
        <td className="py-1.5 px-2"><input type="number" value={areaSqm} onChange={(e) => setAreaSqm(e.target.value)} step="0.01" className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-right" /></td>
        <td className="py-1.5 px-2"><input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full px-2 py-1 border border-slate-300 rounded text-sm" /></td>
        <td className="py-1.5 px-2"><input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="w-full px-2 py-1 border border-slate-300 rounded text-sm" /></td>
        <td className="py-1.5 px-2 hidden sm:table-cell"><input type="text" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} className="w-full px-2 py-1 border border-slate-300 rounded text-sm" /></td>
        <td className="py-1.5 px-2 text-center">
          <button onClick={handleSave} className="text-xs text-blue-600 hover:underline mr-1">Guardar</button>
          <button onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:underline">Cancelar</button>
        </td>
      </tr>
    )
  }

  return (
    <tr className={`border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${!unit.is_active ? 'opacity-50' : ''}`}
      onDoubleClick={() => setEditing(true)}>
      <td className="py-1.5 px-2 font-medium text-slate-800">{unit.unit_number}</td>
      <td className="py-1.5 px-2 text-right tabular-nums">{unit.area_sqm}</td>
      <td className="py-1.5 px-2 text-slate-600">{unit.owner_name || '—'}</td>
      <td className="py-1.5 px-2 text-slate-600 truncate max-w-[150px]">{unit.owner_email || '—'}</td>
      <td className="py-1.5 px-2 text-slate-500 hidden sm:table-cell">{unit.owner_phone || '—'}</td>
      <td className="py-1.5 px-2 text-center">
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(unit.id, !unit.is_active) }}
          className={`w-8 h-5 rounded-full transition-colors relative ${unit.is_active ? 'bg-green-500' : 'bg-slate-300'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${unit.is_active ? 'left-3.5' : 'left-0.5'}`} />
        </button>
      </td>
    </tr>
  )
}
