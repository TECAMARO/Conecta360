import { Clock, MapPin } from 'lucide-react'

export function DeviceMockup() {
  return (
    <div className="relative mx-auto max-w-lg pt-4">
      {/* Laptop */}
      <div className="relative z-10 rounded-xl border border-[#dde8d8] bg-[#2a2a2a] p-2 shadow-lg ring-1 ring-black/5">
        <div className="overflow-hidden rounded-lg bg-white">
          <div className="flex h-48 sm:h-52">
            {/* Sidebar */}
            <div className="flex w-10 shrink-0 flex-col items-center gap-3 bg-[#1a3c34] py-3 sm:w-12">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`size-5 rounded ${i === 0 ? 'bg-[#8ac441]' : 'bg-white/20'}`}
                />
              ))}
            </div>
            {/* Dashboard content */}
            <div className="min-w-0 flex-1 p-3">
              <p className="text-[9px] text-[#5a6b62] sm:text-[10px]">Hola, María</p>
              <p className="text-[10px] font-semibold leading-tight text-[#1a3c34] sm:text-xs">
                Bienvenido a tu espacio de{' '}
                <span className="text-[#8ac441]">conexiones estratégicas</span>
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-md border border-[#dde8d8] p-2">
                  <p className="text-[8px] font-semibold text-[#1a3c34] sm:text-[9px]">
                    Próximas reuniones
                  </p>
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center gap-1 text-[7px] text-[#5a6b62] sm:text-[8px]">
                      <Clock className="size-2 text-[#8ac441]" />
                      10:30 · RV
                    </div>
                    <div className="flex items-center gap-1 text-[7px] text-[#5a6b62] sm:text-[8px]">
                      <MapPin className="size-2 text-[#8ac441]" />
                      Mesa 04
                    </div>
                  </div>
                </div>
                <div className="rounded-md border border-[#dde8d8] p-2">
                  <p className="text-[8px] font-semibold text-[#1a3c34] sm:text-[9px]">
                    Actores recomendados
                  </p>
                  <div className="mt-1.5 flex items-center gap-1">
                    <div className="flex size-5 items-center justify-center rounded bg-[#e8f0e4] text-[7px] font-bold text-[#1a3c34]">
                      RC
                    </div>
                    <span className="rounded-full bg-[#e8f0e4] px-1.5 py-0.5 text-[6px] font-medium text-[#1a3c34] sm:text-[7px]">
                      Impacto Colectivo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Laptop base */}
        <div className="mx-auto mt-1 h-1.5 w-3/4 rounded-b-md bg-[#3a3a3a]" />
      </div>

      {/* Phone */}
      <div className="absolute -right-2 top-16 z-20 w-28 rounded-2xl border-2 border-[#1a3c34]/20 bg-white p-2 shadow-lg ring-1 ring-black/5 sm:-right-6 sm:w-32">
        <div className="mx-auto mb-2 size-10 overflow-hidden rounded-full bg-[#e8f0e4]">
          <div className="flex size-full items-center justify-center text-xs font-bold text-[#1a3c34]">
            MG
          </div>
        </div>
        <p className="text-center text-[10px] font-semibold text-[#1a3c34]">María Gómez</p>
        <p className="mt-2 text-[8px] font-medium text-[#5a6b62]">Intereses</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {['Conservación', 'Innovación social', 'Economía circular'].map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#e8f0e4] px-1.5 py-0.5 text-[6px] font-medium text-[#1a3c34]"
            >
              {tag}
            </span>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 w-full rounded-md bg-[#8ac441] py-1 text-[8px] font-semibold text-[#1a3c34]"
        >
          Editar perfil
        </button>
      </div>

      {/* Decorative plant hint */}
      <div
        className="absolute -bottom-2 -left-4 size-16 rounded-full bg-[#8ac441]/20 blur-xl"
        aria-hidden="true"
      />
    </div>
  )
}
