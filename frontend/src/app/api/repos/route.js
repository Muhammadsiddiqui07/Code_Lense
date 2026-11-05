import { connectDB } from '@/lib/db'
import { python } from '@/lib/python'
import Repo from '@/models/repo'

const GITHUB_RE = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+?(\.git)?\/?$/

export async function GET () {
  await connectDB()
  const repos = await Repo.find().sort({ updatedAt: -1 })
  return Response.json(repos)
}

export async function POST (req) {
  const { repoUrl } = await req.json()
  if (!repoUrl || !GITHUB_RE.test(repoUrl)) {
    return Response.json(
      { error: 'Valid public GitHub URL required' },
      { status: 400 }
    )
  }

  await connectDB()
  const name = repoUrl
    .replace(/\.git$/, '')
    .replace(/\/$/, '')
    .split('/')
    .slice(-2)
    .join('/')
  const repo = await Repo.findOneAndUpdate(
    { url: repoUrl },
    { url: repoUrl, name, status: 'ingesting', error: null },
    { upsert: true, new: true }
  )

  // background mein ingest (await nahi kar rahe, turant 202 dete hain)
  python
    .post('/ingest', { repo_url: repoUrl })
    .then(({ data }) =>
      Repo.findByIdAndUpdate(repo._id, { status: 'ready', chunks: data.chunks })
    )
    .catch(err =>
      Repo.findByIdAndUpdate(repo._id, {
        status: 'failed',
        error: err.response?.data?.detail || err.message
      })
    )

  return Response.json(repo, { status: 202 })
}
