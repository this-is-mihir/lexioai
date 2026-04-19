import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, Eye, Search, Sparkles, UserRound } from 'lucide-react'
import { authApi } from '../../api/axios'
import Card from '../../components/ui/Card'
import Loader from '../../components/ui/Loader'
import PublicNavbar from '../../components/layout/PublicNavbar'
import PublicFooter from '../../components/layout/PublicFooter'
import SelectMenu from '../../components/ui/SelectMenu'

const PAGE_SIZE = 12

const categoryLabels = {
  tutorial: 'Tutorial',
  news: 'News',
  tips: 'Tips',
  case_study: 'Case Study',
  update: 'Update',
}

const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'popular', label: 'Most viewed' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title A-Z' },
]

const formatDate = (value) => {
  if (!value) return 'Recently updated'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently updated'
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const stripHtml = (value = '') => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const getExcerpt = (post) => {
  const fromExcerpt = stripHtml(post?.excerpt || '')
  if (fromExcerpt) return fromExcerpt

  const fromContent = stripHtml(post?.content || '')
  if (fromContent) return `${fromContent.slice(0, 160)}${fromContent.length > 160 ? '...' : ''}`

  return 'Fresh insights from the Lexio AI team.'
}

async function getPublicBlogs() {
  const res = await authApi.get('/widget/blog')
  return res?.data?.data?.posts || []
}

function BlogGridCard({ post }) {
  if (!post?.slug) return null

  return (
    <article className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition hover:-translate-y-0.5 hover:border-primary-500/35 hover:shadow-soft">
      <Link to={`/blog/${post.slug}`} className="block">
        <div className="relative h-48 w-full overflow-hidden bg-[var(--bg-soft)]">
          {post?.coverImage ? (
            <img src={post.coverImage} alt={post?.title || 'Blog cover'} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_18%_20%,rgba(127,119,221,0.26),transparent_42%),radial-gradient(circle_at_80%_25%,rgba(245,158,11,0.18),transparent_35%),linear-gradient(135deg,#101827_0%,#17253a_100%)]" />
          )}

          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
            <span className="inline-flex rounded-full border border-white/35 bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-sm">
              {categoryLabels[post?.category] || 'Article'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/35 bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
              <Eye size={12} /> {post?.views || 0}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <h2 className="line-clamp-2 text-lg font-bold leading-tight text-[var(--text)] transition group-hover:text-primary-500">
            {post?.title || 'Untitled post'}
          </h2>

          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--text-muted)]">{getExcerpt(post)}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <UserRound size={13} />
              {post?.author || 'Lexio AI Team'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} />
              {formatDate(post?.publishedAt || post?.createdAt)}
            </span>
          </div>

          <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-500">
            Read article <ArrowRight size={14} />
          </div>
        </div>
      </Link>
    </article>
  )
}

export default function BlogPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [page, setPage] = useState(1)

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['public-blog-posts'],
    queryFn: getPublicBlogs,
  })

  const categories = useMemo(() => {
    const all = new Set((posts || []).map((post) => post?.category).filter(Boolean))
    return ['all', ...Array.from(all)]
  }, [posts])

  const filteredAndSortedPosts = useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = (posts || []).filter((post) => {
      const inCategory = category === 'all' ? true : post?.category === category
      if (!inCategory) return false
      if (!query) return true

      const haystack = [
        post?.title,
        post?.excerpt,
        post?.author,
        ...(post?.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })

    const sorted = [...filtered]
    sorted.sort((a, b) => {
      if (sortBy === 'popular') {
        return (b?.views || 0) - (a?.views || 0)
      }

      if (sortBy === 'oldest') {
        return new Date(a?.publishedAt || a?.createdAt || 0).getTime() - new Date(b?.publishedAt || b?.createdAt || 0).getTime()
      }

      if (sortBy === 'title') {
        return String(a?.title || '').localeCompare(String(b?.title || ''))
      }

      return new Date(b?.publishedAt || b?.createdAt || 0).getTime() - new Date(a?.publishedAt || a?.createdAt || 0).getTime()
    })

    return sorted
  }, [posts, category, search, sortBy])

  useEffect(() => {
    setPage(1)
  }, [search, category, sortBy])

  const totalPosts = filteredAndSortedPosts.length
  const totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const paginatedPosts = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredAndSortedPosts.slice(start, start + PAGE_SIZE)
  }, [filteredAndSortedPosts, safePage])

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1]

    const start = Math.max(1, safePage - 2)
    const end = Math.min(totalPages, safePage + 2)
    const nums = []

    for (let i = start; i <= end; i += 1) nums.push(i)

    if (nums[0] !== 1) nums.unshift(1)
    if (nums[nums.length - 1] !== totalPages) nums.push(totalPages)

    return nums
  }, [safePage, totalPages])

  if (isLoading) {
    return <Loader label="Loading blog" variant="landing" />
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <PublicNavbar />

      <section className="relative overflow-hidden border-b border-[var(--border)] px-4 py-10 sm:py-12">
        <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-primary-500/16 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-cyan-400/12 blur-3xl" />

        <div className="relative mx-auto w-full max-w-7xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500">
            <Sparkles size={13} /> Articles & insights
          </p>

          <h1 className="mt-4 text-[clamp(2rem,4vw,3.2rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">Blog</h1>
          <p className="mt-3 max-w-3xl text-sm text-[var(--text-muted)] sm:text-base">
            Real product updates, practical support playbooks, and growth insights written by the Lexio AI team.
          </p>

          <Card className="mt-7 border border-[var(--border)] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative block w-full sm:min-w-0 sm:flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, author, tags..."
                  className="input pl-9"
                />
              </label>

              <div className="w-full sm:w-[220px] sm:flex-none">
                <SelectMenu
                  value={sortBy}
                  onChange={setSortBy}
                  options={sortOptions}
                  className="w-full"
                  buttonClassName="h-11 text-sm"
                  menuClassName="max-h-56"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {categories.map((item) => {
                const active = category === item
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={active ? 'btn-primary !h-8 !px-3.5 !text-xs' : 'btn-secondary !h-8 !px-3.5 !text-xs'}
                  >
                    {item === 'all' ? 'All' : (categoryLabels[item] || item)}
                  </button>
                )
              })}
            </div>
          </Card>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--text-muted)]">
          <p>
            Showing {totalPosts ? (safePage - 1) * PAGE_SIZE + 1 : 0}
            {' '}-{' '}
            {Math.min(safePage * PAGE_SIZE, totalPosts)} of {totalPosts} posts
          </p>
          <p>Page {safePage} of {totalPages}</p>
        </div>

        {paginatedPosts.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedPosts.map((post) => (
              <BlogGridCard key={post._id || post.slug} post={post} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-lg font-semibold">No blog posts found</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Try another keyword or category filter.</p>
          </Card>
        )}

        {totalPages > 1 ? (
          <div className="mt-8 flex items-center justify-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="btn-secondary !h-9 !px-3 disabled:opacity-45"
            >
              <ChevronLeft size={15} /> Prev
            </button>

            {pageNumbers.map((num, idx) => {
              const prev = pageNumbers[idx - 1]
              const showDots = prev && num - prev > 1

              return (
                <div key={num} className="contents">
                  {showDots ? <span className="px-1 text-sm text-[var(--text-muted)]">...</span> : null}
                  <button
                    type="button"
                    onClick={() => setPage(num)}
                    className={num === safePage ? 'btn-primary !h-9 !w-9 !px-0' : 'btn-secondary !h-9 !w-9 !px-0'}
                  >
                    {num}
                  </button>
                </div>
              )
            })}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="btn-secondary !h-9 !px-3 disabled:opacity-45"
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        ) : null}
      </main>

      <PublicFooter />
    </div>
  )
}
