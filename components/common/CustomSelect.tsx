import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder: string;
  className?: string;
  buttonClassName?: string;
}

export default function CustomSelect({ value, onChange, options, placeholder, className = "", buttonClassName = "" }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between gap-2 cursor-pointer rounded-xl border border-white/10 outline-none hover:border-violet-500/50 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors ${buttonClassName || 'bg-[#1A1D24] px-4 py-2 text-sm text-gray-200'}`}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full min-w-max rounded-xl border border-white/10 bg-[#2B2D36] p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100">
          <ul className="max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
            <li
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className={`cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors ${
                value === "" ? "bg-violet-600/20 text-violet-400 font-medium" : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {placeholder}
            </li>
            {options.map((opt) => (
              <li
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors ${
                  value === opt.value ? "bg-violet-600/20 text-violet-400 font-medium" : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
