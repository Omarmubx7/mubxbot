import React from 'react';
import Link from 'next/link';

const SITE_URL = 'https://bot.mubx.dev';

export const metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about MUBXBot for HTU faculty search, including instructor email lookup, office hours, department search, and office locations.',
  alternates: {
    canonical: '/faq'
  },
  openGraph: {
    title: 'MUBXBot FAQ | HTU School of Computing',
    description: 'Answers to common MUBXBot questions about instructor email lookup, office hours, office locations, and department search at HTU.',
    url: `${SITE_URL}/faq`,
    type: 'article'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MUBXBot FAQ | HTU School of Computing',
    description: 'Answers to common MUBXBot questions about instructor email lookup, office hours, office locations, and department search at HTU.'
  }
};

const FAQ_ITEMS = [
  {
    question: 'How do I find an HTU instructor email?',
    answer: 'Type what followed by the instructor name. Example: what Dr. Ahmed.'
  },
  {
    question: 'How do I check HTU office hours?',
    answer: 'Type when followed by the instructor name. Example: when Dr. Smith.'
  },
  {
    question: 'How do I find a professor office location?',
    answer: 'Type where followed by the instructor name. Example: where Professor Johnson.'
  },
  {
    question: 'Can I search HTU faculty by department?',
    answer: 'Yes. Ask by department and MUBXBot returns matching instructors in that department.'
  },
  {
    question: 'Does MUBXBot support typo-tolerant search?',
    answer: 'Yes. MUBXBot uses fuzzy matching to help with misspellings and near matches.'
  }
];

const faqStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer
    }
  }))
};

export default function FAQPage() {
  return (
    <main className="min-h-dvh bg-[#F8F9FA] text-[#111827] dark:bg-[#0B0B0C] dark:text-[#F3F4F6]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

      <div className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">MUBXBot FAQ</h1>
        <p className="mt-3 text-[15px] leading-7 text-black/70 dark:text-white/70">
          Quick answers to common questions about using MUBXBot for HTU faculty search, including instructor email lookup, office hour checks, and office location lookup.
        </p>

        <div className="mt-8 space-y-4">
          {FAQ_ITEMS.map((item) => (
            <article key={item.question} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <h2 className="text-lg font-bold tracking-tight">{item.question}</h2>
              <p className="mt-2 text-[15px] leading-7 text-black/75 dark:text-white/75">{item.answer}</p>
            </article>
          ))}
        </div>

        <div className="mt-10">
          <Link href="/" className="inline-flex items-center rounded-xl bg-[#DC2626] px-4 py-2.5 text-sm font-bold text-white">
            Back to MUBXBot
          </Link>
        </div>
      </div>
    </main>
  );
}
