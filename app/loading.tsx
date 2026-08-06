import { Spinner } from "@/components/ui/Spinner";

// Корневой фолбэк на время загрузки серверного сегмента (Suspense-граница
// Next.js) — без него переход, например, на страницу события — это белый
// экран до готовности данных. Большинство страниц клиентские и рисуют
// собственный скелетон сразу же, так что этот файл почти никогда не виден.
export default function RootLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper">
      <Spinner className="size-8 text-[color:var(--color-signal-deep)]" />
    </div>
  );
}
