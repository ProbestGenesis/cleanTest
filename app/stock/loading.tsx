import { Skeleton } from '@/components/ui/skeleton'

type Props = {}

function loading({}: Props) {
  return (
    <div className="p-4">
      <div className="flex flex-row gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <Skeleton className="w-3xs h-42.5" key={idx} />
        ))}
      </div>
    </div>
  )
}

export default loading
