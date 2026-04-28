import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Calendar, Clock3, Eye, ListTree, Tag, UserRound } from 'lucide-react'
import { authApi } from '../../api/axios'
import Card from '../../components/ui/Card'
import Loader from '../../components/ui/Loader'
import PublicNavbar from '../../components/layout/PublicNavbar'

const categoryLabels = {
  tutorial: 'Tutorial',
  news: 'News',
  tips: 'Tips',
  case_study: 'Case Study',
  update: 'Update',
}

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

const sanitizeHtml = (value = '') =>
  value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+=("[^"]*"|'[^']*')/gi, '')
    .replace(/javascript:/gi, '')

const escapeHtml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const plainTextToHtml = (value = '') => {
  const normalized = String(value || '').replace(/\r\n/g, '\n').trim()
  if (!normalized) return '<p>No content available.</p>'

  return normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
    .join('')
}

const toSlug = (value) =>
  (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const enrichContentWithHeadings = (raw = '') => {
  const rawText = String(raw || '')
  if (!rawText.trim()) {
    return { html: '<p>No content available.</p>', headings: [], plainText: '' }
  }

  const safe = sanitizeHtml(rawText)
  const hasHtmlTags = /<\s*[a-z][^>]*>/i.test(safe)
  const renderSource = hasHtmlTags ? safe : plainTextToHtml(rawText)

  if (typeof window === 'undefined') {
    return { html: renderSource, headings: [], plainText: stripHtml(renderSource) }
  }

  const parser = new window.DOMParser()
  const doc = parser.parseFromString(renderSource, 'text/html')
  const headingNodes = Array.from(doc.querySelectorAll('h2, h3'))
  const slugCount = {}
  const headings = []

  headingNodes.forEach((node, index) => {
    const text = (node.textContent || '').trim()
    if (!text) return

    const base = toSlug(text) || `section-${index + 1}`
    const count = slugCount[base] || 0
    slugCount[base] = count + 1
    const id = count > 0 ? `${base}-${count + 1}` : base

    node.setAttribute('id', id)
    headings.push({
      id,
      text,
      level: node.tagName.toLowerCase(),
    })
  })

  const html = doc.body.innerHTML
  const plainText = stripHtml(doc.body.textContent || renderSource)

  return { html, headings, plainText }
}

async function getPublicBlogPost(slug) {
  const res = await authApi.get(`/widget/blog/${slug}`)
  return res?.data?.data?.post || null
}

async function getPublicBlogs() {
  const res = await authApi.get('/widget/blog')
  return res?.data?.data?.posts || []
}

function PopularPostItem({ post, rank }) {
  if (!post?.slug) return null

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group block overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] transition hover:border-primary-500/35 hover:shadow-soft"
    >
      <div className="relative h-36 w-full overflow-hidden bg-[var(--bg)]">
        {post?.coverImage ? (
          <img src={post.coverImage} alt={post?.title || 'Cover'} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_18%_20%,rgba(127,119,221,0.26),transparent_42%),radial-gradient(circle_at_80%_25%,rgba(245,158,11,0.18),transparent_35%),linear-gradient(135deg,#101827_0%,#17253a_100%)]" />
        )}
        <span className="absolute left-2 top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-white/35 bg-black/50 px-1.5 text-[11px] font-semibold text-white">
          {rank}
        </span>
      </div>

      <div className="p-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1">
            <Calendar size={12} /> {formatDate(post?.publishedAt || post?.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye size={12} /> {post?.views || 0}
          </span>
        </div>

        <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--text)] transition group-hover:text-primary-500">
          {post?.title || 'Untitled post'}
        </p>
      </div>
    </Link>
  )
}

export default function BlogDetailPage() {
  const { slug } = useParams()
  const [activeHeading, setActiveHeading] = useState('')
  const [scrollProgress, setScrollProgress] = useState(0)

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['public-blog-post', slug],
    queryFn: () => getPublicBlogPost(slug),
    enabled: Boolean(slug),
  })

  const { data: allPosts = [] } = useQuery({
    queryKey: ['public-blog-popular'],
    queryFn: getPublicBlogs,
  })

  const preparedContent = useMemo(() => enrichContentWithHeadings(post?.content || ''), [post?.content])
  const hasToc = preparedContent.headings.length > 0

  const readingMinutes = useMemo(() => {
    const words = preparedContent.plainText.split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.round(words / 220))
  }, [preparedContent.plainText])

  const popularPosts = useMemo(() => {
    const sorted = [...(allPosts || [])]
      .filter((item) => item?.slug)
      .sort((a, b) => (b?.views || 0) - (a?.views || 0))

    const withoutCurrent = sorted.filter((item) => item.slug !== slug)
    return (withoutCurrent.length ? withoutCurrent : sorted).slice(0, 4)
  }, [allPosts, slug])

  useEffect(() => {
    if (!preparedContent.headings.length) {
      setActiveHeading('')
      return
    }

    setActiveHeading((current) => current || preparedContent.headings[0].id)

    const observer = new window.IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visible[0]?.target?.id) {
          setActiveHeading(visible[0].target.id)
        }
      },
      {
        rootMargin: '-16% 0px -68% 0px',
        threshold: [0.2, 0.45, 0.7],
      },
    )

    preparedContent.headings.forEach((heading) => {
      const el = document.getElementById(heading.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [preparedContent.headings])

  useEffect(() => {
    const handleScroll = () => {
      const doc = document.documentElement
      const scrollTop = window.scrollY || doc.scrollTop
      const max = doc.scrollHeight - window.innerHeight
      if (max <= 0) {
        setScrollProgress(0)
        return
      }
      setScrollProgress(Math.min(100, (scrollTop / max) * 100))
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [preparedContent.html])

  if (isLoading) {
    return <Loader label="Loading article" variant="landing" />
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <PublicNavbar />
        <main className="mx-auto flex w-full max-w-3xl items-center justify-center px-4 py-16">
          <Card className="w-full p-8 text-center">
            <p className="text-xl font-bold">Post not found</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">The article may be unpublished or removed.</p>
            <Link to="/blog" className="btn-secondary mt-5">Back to blog</Link>
          </Card>
        </main>
      </div>
    )
  }

  const handleTocClick = (id) => {
    const element = document.getElementById(id)
    if (!element) return

    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveHeading(id)
    window.history.replaceState(null, '', `#${id}`)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="fixed inset-x-0 top-0 z-50 h-[2px] bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-primary-500 via-cyan-400 to-emerald-400 transition-[width] duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <PublicNavbar />

      <section className="border-b border-[var(--border)] px-4 py-8 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <Link to="/blog" className="btn-secondary !h-10 !px-4 !text-sm">
            <ArrowLeft size={14} /> Back to blog
          </Link>

          <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_14px_34px_rgba(12,18,28,0.14)]">
            {post?.coverImage ? (
              <div className="relative w-full overflow-hidden bg-[var(--bg-soft)]">
                {/* Blurred background fill */}
                <img
                  src={post.coverImage}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-20"
                />
                {/* Actual image — full, no crop */}
                <div className="relative z-10 flex items-center justify-center px-2 py-2 sm:px-4 sm:py-4">
                  <img
                    src={post.coverImage}
                    alt={post?.title || 'Cover image'}
                    className="max-h-[420px] w-auto max-w-full rounded-lg border border-[var(--border)] object-contain shadow-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="h-[220px] w-full bg-[radial-gradient(circle_at_18%_20%,rgba(127,119,221,0.26),transparent_42%),radial-gradient(circle_at_80%_25%,rgba(245,158,11,0.18),transparent_35%),linear-gradient(135deg,#101827_0%,#17253a_100%)]" />
            )}

            <div className="p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-primary-500/35 bg-primary-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-500">
                  {categoryLabels[post?.category] || 'Article'}
                </span>
                <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
                  <Clock3 size={12} className="mr-1" /> {readingMinutes} min read
                </span>
              </div>

              <h1 className="mt-3 text-[clamp(1.45rem,3.2vw,2.4rem)] font-black leading-[1.02] tracking-[-0.02em] text-[var(--text)]">
                {post?.title || 'Untitled post'}
              </h1>

              {post?.excerpt ? (
                <p className="mt-2 text-sm text-[var(--text-muted)] sm:text-base">{post.excerpt}</p>
              ) : null}

              <div className="mt-4 grid gap-2 text-sm text-[var(--text-muted)] sm:grid-cols-2 lg:grid-cols-4">
                <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--bg-soft)] px-3 py-2">
                  <Calendar size={14} /> {formatDate(post?.publishedAt || post?.createdAt)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--bg-soft)] px-3 py-2">
                  <UserRound size={14} /> {post?.author || 'Lexio AI Team'}
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--bg-soft)] px-3 py-2">
                  <Eye size={14} /> {post?.views || 0} views
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--bg-soft)] px-3 py-2">
                  <Clock3 size={14} /> {readingMinutes} min read
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-8">
          <div className="space-y-5">
            {post?.tags?.length ? (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)]">
                    <Tag size={12} /> {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <Card className="overflow-hidden border border-[var(--border)] p-0 shadow-soft">
              <div className="border-b border-[var(--border)] bg-[var(--bg-soft)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] sm:px-8">
                Article
              </div>
              <article
                className="px-5 py-6 text-[16px] leading-8 text-[var(--text-muted)] sm:px-8 sm:py-8 [&_h1]:mt-10 [&_h1]:text-[2rem] [&_h1]:font-black [&_h1]:leading-tight [&_h1]:tracking-[-0.02em] [&_h1]:text-[var(--text)] [&_h1]:scroll-mt-24 [&_h2]:mt-9 [&_h2]:text-[1.65rem] [&_h2]:font-extrabold [&_h2]:leading-tight [&_h2]:tracking-[-0.02em] [&_h2]:text-[var(--text)] [&_h2]:scroll-mt-24 [&_h3]:mt-8 [&_h3]:text-[1.3rem] [&_h3]:font-bold [&_h3]:leading-snug [&_h3]:text-[var(--text)] [&_h3]:scroll-mt-24 [&_p]:my-4 [&_p]:text-[16px] [&_p]:leading-8 [&_blockquote]:my-7 [&_blockquote]:rounded-r-2xl [&_blockquote]:border-l-4 [&_blockquote]:border-primary-500 [&_blockquote]:bg-primary-500/5 [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:italic [&_blockquote]:text-[var(--text)] [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-6 [&_li]:pl-1 [&_img]:my-7 [&_img]:max-w-full [&_img]:h-auto [&_img]:mx-auto [&_img]:rounded-2xl [&_img]:border [&_img]:border-[var(--border)] [&_img]:shadow-[0_14px_34px_rgba(15,20,35,0.18)] [&_hr]:my-8 [&_hr]:border-[var(--border)] [&_a]:font-semibold [&_a]:text-primary-500 [&_a]:underline [&_a]:decoration-primary-500/45 [&_a:hover]:text-primary-400"
                dangerouslySetInnerHTML={{ __html: preparedContent.html }}
              />
            </Card>

            {hasToc ? (
              <Card className="overflow-hidden border border-[var(--border)] p-0 lg:hidden">
                <div className="border-b border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  On this page
                </div>
                <div className="p-3 space-y-1">
                  {preparedContent.headings.map((heading) => {
                    const active = activeHeading === heading.id
                    return (
                      <button
                        key={heading.id}
                        type="button"
                        onClick={() => handleTocClick(heading.id)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${heading.level === 'h3' ? 'pl-5' : ''} ${active ? 'border-primary-500/40 bg-primary-500/12 text-primary-500' : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:bg-[var(--bg-soft)] hover:text-[var(--text)]'}`}
                      >
                        {heading.text}
                      </button>
                    )
                  })}
                </div>
              </Card>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <Card className="overflow-hidden border border-[var(--border)] p-0 shadow-soft">
              <div className="border-b border-[var(--border)] bg-[var(--bg-soft)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Popular Post</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text)]">Most viewed articles</p>
              </div>

              <div className="space-y-3 p-3">
                {popularPosts.length ? (
                  popularPosts.map((item, index) => (
                    <PopularPostItem key={item?._id || item?.slug} post={item} rank={index + 1} />
                  ))
                ) : (
                  <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-4 text-sm text-[var(--text-muted)]">
                    Popular posts will appear as soon as there are more published articles.
                  </p>
                )}
              </div>
            </Card>

            {hasToc ? (
              <Card className="hidden overflow-hidden border border-[var(--border)] p-0 lg:block">
                <div className="border-b border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  On this page
                </div>

                <div className="space-y-1 p-3">
                  {preparedContent.headings.map((heading) => {
                    const active = activeHeading === heading.id
                    return (
                      <button
                        key={heading.id}
                        type="button"
                        onClick={() => handleTocClick(heading.id)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${heading.level === 'h3' ? 'pl-5' : ''} ${active ? 'border-primary-500/40 bg-primary-500/12 text-primary-500' : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:bg-[var(--bg-soft)] hover:text-[var(--text)]'}`}
                      >
                        {heading.text}
                      </button>
                    )
                  })}
                </div>
              </Card>
            ) : null}
          </aside>
        </div>
      </main>
    </div>
  )
}
