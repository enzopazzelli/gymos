"use client"

import { useState, useTransition, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, ChevronLeft, Users, X } from "lucide-react"
import Link from "next/link"
import {
  addBlock, deleteBlock,
  addExerciseToBlock, removeExerciseFromBlock,
  assignRoutineToStudent, unassignRoutine,
} from "@/lib/actions/routines"

type Exercise = { id: string; name: string; category: string }
type RoutineExercise = {
  id: string; blockId: string; exerciseId: string
  exerciseName: string | null; exerciseCategory: string
  sets: number | null; reps: string | null; technicalNotes: string | null; order: number
}
type Block = { id: string; name: string; order: number; exercises: RoutineExercise[] }
type Assignment = { assignmentId: string; studentId: string; studentName: string | null }

interface Routine {
  id: string; name: string; description: string | null
  blocks: Block[]; assignments: Assignment[]
}
interface Student { id: string; name: string | null }

interface Props {
  routine: Routine
  exercises: Exercise[]
  students: Student[]
}

const CATEGORY_LABELS: Record<string, string> = {
  strength: "Fuerza",
  conditioning: "Acond.",
  rehab: "Rehab.",
  mobility: "Movilidad",
}

export function RoutineEditor({ routine, exercises, students }: Props) {
  const [pending, startTransition] = useTransition()

  // Add block
  const [showAddBlock, setShowAddBlock] = useState(false)
  const [blockName, setBlockName] = useState("")

  // Add exercise dialog
  const [addExDialog, setAddExDialog] = useState<{ blockId: string; blockName: string; order: number } | null>(null)
  const [exSearch, setExSearch] = useState("")
  const [selectedEx, setSelectedEx] = useState<Exercise | null>(null)
  const [newExCategory, setNewExCategory] = useState("strength")
  const [sets, setSets] = useState("")
  const [reps, setReps] = useState("")
  const [notes, setNotes] = useState("")

  // Assign dialog
  const [showAssign, setShowAssign] = useState(false)
  const [assignStudentId, setAssignStudentId] = useState("")

  const assignedIds = new Set(routine.assignments.map((a) => a.studentId))
  const availableStudents = students.filter((s) => !assignedIds.has(s.id))

  const filteredExercises = useMemo(() => {
    if (!exSearch) return exercises
    return exercises.filter((e) => e.name.toLowerCase().includes(exSearch.toLowerCase()))
  }, [exercises, exSearch])

  function openAddEx(blockId: string, blockName: string, order: number) {
    setAddExDialog({ blockId, blockName, order })
    setExSearch("")
    setSelectedEx(null)
    setNewExCategory("strength")
    setSets("")
    setReps("")
    setNotes("")
  }

  function handleAddBlock() {
    if (!blockName.trim()) return
    const fd = new FormData()
    fd.set("routineId", routine.id)
    fd.set("name", blockName)
    fd.set("order", String(routine.blocks.length + 1))
    startTransition(async () => {
      await addBlock(fd)
      setBlockName("")
      setShowAddBlock(false)
    })
  }

  function handleDeleteBlock(blockId: string) {
    startTransition(() => deleteBlock(blockId, routine.id))
  }

  function handleAddExercise() {
    if (!addExDialog) return
    const isNew = !selectedEx && exSearch.trim()
    if (!selectedEx && !exSearch.trim()) return

    const fd = new FormData()
    fd.set("blockId", addExDialog.blockId)
    fd.set("routineId", routine.id)
    fd.set("order", String(addExDialog.order))
    if (selectedEx) {
      fd.set("exerciseId", selectedEx.id)
    } else {
      fd.set("exerciseName", exSearch.trim())
      fd.set("category", newExCategory)
    }
    if (sets) fd.set("sets", sets)
    if (reps) fd.set("reps", reps)
    if (notes) fd.set("technicalNotes", notes)

    startTransition(async () => {
      await addExerciseToBlock(fd)
      setAddExDialog(null)
    })
  }

  function handleRemoveExercise(routineExerciseId: string) {
    startTransition(() => removeExerciseFromBlock(routineExerciseId, routine.id))
  }

  function handleAssign() {
    if (!assignStudentId) return
    const fd = new FormData()
    fd.set("routineId", routine.id)
    fd.set("studentId", assignStudentId)
    startTransition(async () => {
      await assignRoutineToStudent(fd)
      setAssignStudentId("")
      setShowAssign(false)
    })
  }

  function handleUnassign(assignmentId: string) {
    startTransition(() => unassignRoutine(assignmentId, routine.id))
  }

  const isNewExercise = !selectedEx && exSearch.trim() && filteredExercises.length === 0

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Link href="/coach/rutinas" className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors shrink-0 mt-0.5">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold">{routine.name}</h2>
          {routine.description && (
            <p className="text-sm text-muted-foreground">{routine.description}</p>
          )}
        </div>
      </div>

      {/* Blocks */}
      <div className="space-y-3">
        {routine.blocks.map((block) => (
          <div key={block.id} className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b">
              <p className="font-semibold text-sm">{block.name}</p>
              <button
                onClick={() => handleDeleteBlock(block.id)}
                disabled={pending}
                className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {block.exercises.length === 0 ? (
              <p className="px-4 py-3 text-xs text-muted-foreground italic">Sin ejercicios.</p>
            ) : (
              <div className="divide-y">
                {block.exercises.map((ex) => (
                  <div key={ex.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ex.exerciseName}</p>
                      <p className="text-xs text-muted-foreground">
                        {[
                          ex.sets ? `${ex.sets} series` : null,
                          ex.reps ? `× ${ex.reps}` : null,
                        ].filter(Boolean).join(" ") || "—"}
                        {ex.technicalNotes && <span className="ml-1 italic">· {ex.technicalNotes}</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveExercise(ex.id)}
                      disabled={pending}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="px-3 py-2 border-t">
              <button
                onClick={() => openAddEx(block.id, block.name, block.exercises.length + 1)}
                className="flex items-center gap-1.5 text-xs text-primary font-medium py-1 px-2 rounded-lg hover:bg-primary/10 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar ejercicio
              </button>
            </div>
          </div>
        ))}

        {/* Add block */}
        {showAddBlock ? (
          <div className="rounded-xl border bg-card p-3 space-y-2">
            <Input
              autoFocus
              placeholder="Ej: Bloque A, Entrada en calor, Vuelta a la calma..."
              value={blockName}
              onChange={(e) => setBlockName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddBlock()}
              className="h-9"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddBlock} disabled={pending || !blockName.trim()} className="flex-1">
                Agregar
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowAddBlock(false); setBlockName("") }} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddBlock(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-muted-foreground/30 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nuevo bloque
          </button>
        )}
      </div>

      {/* Assignments */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            Asignada a
          </h3>
          {availableStudents.length > 0 && (
            <button onClick={() => setShowAssign(true)} className="text-xs text-primary font-medium hover:underline">
              + Asignar alumno
            </button>
          )}
        </div>

        {routine.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin alumnos asignados.</p>
        ) : (
          <div className="divide-y rounded-xl border bg-card overflow-hidden">
            {routine.assignments.map((a) => (
              <div key={a.assignmentId} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm font-medium">{a.studentName}</p>
                <button
                  onClick={() => handleUnassign(a.assignmentId)}
                  disabled={pending}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add exercise dialog */}
      <Dialog open={!!addExDialog} onOpenChange={(o) => !o && setAddExDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar ejercicio — {addExDialog?.blockName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div className="space-y-1.5">
              <Label>Ejercicio</Label>
              {selectedEx ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/50">
                  <span className="flex-1 text-sm font-medium">{selectedEx.name}</span>
                  <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[selectedEx.category]}</span>
                  <button onClick={() => setSelectedEx(null)}>
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Input
                    placeholder="Buscar o escribir nombre nuevo..."
                    value={exSearch}
                    onChange={(e) => setExSearch(e.target.value)}
                  />
                  {exSearch && (
                    <div className="rounded-lg border bg-card max-h-44 overflow-y-auto">
                      {filteredExercises.slice(0, 8).map((ex) => (
                        <button
                          key={ex.id}
                          onClick={() => { setSelectedEx(ex); setExSearch("") }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors border-b last:border-b-0 flex items-center justify-between"
                        >
                          <span>{ex.name}</span>
                          <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[ex.category]}</span>
                        </button>
                      ))}
                      {filteredExercises.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Se creará <span className="font-medium text-foreground">"{exSearch}"</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {isNewExercise && (
              <div className="space-y-1.5">
                <Label>Categoría del ejercicio nuevo</Label>
                <select
                  value={newExCategory}
                  onChange={(e) => setNewExCategory(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
                >
                  <option value="strength">Fuerza</option>
                  <option value="conditioning">Acondicionamiento</option>
                  <option value="rehab">Rehabilitación</option>
                  <option value="mobility">Movilidad</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Series</Label>
                <Input type="number" placeholder="3" value={sets} onChange={(e) => setSets(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label>Reps / Tiempo</Label>
                <Input placeholder="8-10 / 30s" value={reps} onChange={(e) => setReps(e.target.value)} className="h-9" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notas técnicas</Label>
              <Textarea
                placeholder="Ej: Mantener espalda neutra..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleAddExercise}
              disabled={pending || (!selectedEx && !exSearch.trim())}
              className="w-full"
            >
              {pending ? "Agregando..." : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar rutina a alumno</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <select
              value={assignStudentId}
              onChange={(e) => setAssignStudentId(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
            >
              <option value="">Seleccionar alumno...</option>
              {availableStudents.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button onClick={handleAssign} disabled={pending || !assignStudentId} className="w-full">
              {pending ? "Asignando..." : "Asignar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
