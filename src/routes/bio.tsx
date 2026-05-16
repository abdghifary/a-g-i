import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/bio')({
  component: Bio,
})

function Bio() {
  return (
    <main className="flex h-full flex-col p-4 gap-4 max-w-5xl mx-auto w-full">
      <div className="px-4 py-2" box-="square">
        <h1 className="text-xl font-bold">About</h1>
        <p className="mt-2 opacity-80">Content coming soon</p>
      </div>
    </main>
  )
}
