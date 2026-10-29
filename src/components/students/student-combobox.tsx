"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterStudents, studentOptionLabel, type StudentSearchOption } from "@/lib/student-search";
import { Input } from "@/components/ui/input";

export type StudentComboboxProps = {
  students: StudentSearchOption[];
  value: string;
  onChange: (studentId: string) => void;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  maxResults?: number;
  className?: string;
  autoFocus?: boolean;
};

export function StudentCombobox({
  students,
  value,
  onChange,
  id,
  name,
  required,
  disabled,
  invalid,
  placeholder = "Selecciona un estudiante",
  maxResults = 100,
  className,
  autoFocus,
}: StudentComboboxProps) {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const listboxId = `${baseId}-listbox`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [placement, setPlacement] = useState<"bottom" | "top">("bottom");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = students.find((student) => student.id === value) ?? null;
  const matches = useMemo(() => filterStudents(students, query), [students, query]);
  const ordered = useMemo(() => {
    if (query.trim() === "" && selected) {
      return [selected, ...matches.filter((student) => student.id !== selected.id)];
    }
    return matches;
  }, [matches, query, selected]);
  const visible = useMemo(
    () => ordered.slice(0, Math.max(1, maxResults)),
    [ordered, maxResults],
  );
  const displayValue = open ? query : selected ? studentOptionLabel(selected) : "";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
        setActiveIndex(-1);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document
      .getElementById(`${baseId}-option-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, baseId, open]);

  function openList() {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    setActiveIndex(students.length > 0 ? 0 : -1);
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      setPlacement(spaceBelow < 300 && rect.top > spaceBelow ? "top" : "bottom");
    }
  }

  function closeList() {
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
  }

  function selectStudent(student: StudentSearchOption) {
    onChange(student.id);
    closeList();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          openList();
        } else if (visible.length > 0) {
          setActiveIndex((index) => Math.min(index + 1, visible.length - 1));
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) {
          openList();
        } else {
          setActiveIndex((index) => Math.max(index - 1, 0));
        }
        break;
      case "Home":
        if (open) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      case "End":
        if (open) {
          event.preventDefault();
          setActiveIndex(visible.length - 1);
        }
        break;
      case "Enter":
        if (open) {
          event.preventDefault();
          const option = visible[activeIndex];
          if (option) selectStudent(option);
        }
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          closeList();
        }
        break;
      case "Tab":
        if (open) closeList();
        break;
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400"
      />
      <Input
        ref={inputRef}
        id={baseId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${baseId}-option-${activeIndex}` : undefined}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        disabled={disabled}
        value={displayValue}
        placeholder={open ? "Buscar por nombre, documento o curso…" : placeholder}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onClick={() => {
          if (!open) openList();
        }}
        onFocus={openList}
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null;
          if (next && !containerRef.current?.contains(next)) closeList();
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "pl-9 pr-16",
          invalid && "border-red-400 focus:border-red-500 focus:ring-red-100",
          open && "border-brand-500 ring-2 ring-brand-200",
        )}
      />

      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
        {selected || query ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Limpiar estudiante"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange("");
              closeList();
            }}
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? "Cerrar lista de estudiantes" : "Mostrar lista de estudiantes"}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (open) {
              closeList();
            } else {
              inputRef.current?.focus();
              openList();
            }
          }}
          className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open ? (
        <div
          className={cn(
            "absolute left-0 right-0 z-50 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg",
            placement === "bottom" ? "top-full mt-1" : "bottom-full mb-1",
          )}
        >
          {visible.length === 0 ? (
            <p role="status" className="px-3 py-6 text-center text-sm text-slate-500">
              Sin resultados.
            </p>
          ) : (
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Estudiantes"
              className="scroll-thin max-h-64 overflow-y-auto py-1"
            >
              {visible.map((student, index) => (
                <li
                  key={student.id}
                  id={`${baseId}-option-${index}`}
                  role="option"
                  aria-selected={student.id === value}
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectStudent(student)}
                  className={cn(
                    "cursor-pointer px-3 py-2 text-sm text-slate-700",
                    index === activeIndex && "bg-brand-50 text-brand-900",
                    student.id === value && "font-medium",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{student.name}</span>
                    {student.id === value ? <Check className="size-4 shrink-0 text-brand-600" /> : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    {student.documentId} · {student.courseName}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {ordered.length > visible.length ? (
            <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
              Mostrando {visible.length} de {ordered.length}. Escribe para filtrar.
            </p>
          ) : null}
        </div>
      ) : null}

      {name ? (
        <>
          <input type="hidden" name={name} value={value} />
          {required ? (
            <input
              type="text"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              value={selected ? "1" : ""}
              onChange={() => undefined}
              required
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
