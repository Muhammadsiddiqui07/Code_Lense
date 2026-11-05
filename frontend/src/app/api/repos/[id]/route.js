import { connectDB } from '@/lib/db'
import Repo from '@/models/repo'

export const dynamic = 'force-dynamic'

export async function GET (_req, { params }) {
  const { id } = await params
  await connectDB()
  try {
    const repo = await Repo.findById(id)
    if (!repo) throw new Error('not found')
    return Response.json(repo)
  } catch {
    return Response.json({ error: 'Repo not found' }, { status: 404 })
  }
}
