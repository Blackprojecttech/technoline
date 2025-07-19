'use client';

import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ArrowLeft, Star } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Review {
  _id: string;
  author: string;
  rating: number;
  text: string;
  createdAt: string;
}

export default function ProductReviewsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Здесь должен быть реальный fetch отзывов по slug
    setLoading(false);
    setReviews([]); // Пока заглушка
  }, [slug]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-light-50 to-accent-50">
      <Header />
      <main className="pt-28 pb-16">
        <div className="container mx-auto px-4 py-8 animate-fade-in">
          <button
            className="flex items-center gap-2 text-primary-600 hover:underline mb-8 bg-white rounded-full px-4 py-2 shadow transition hover:bg-primary-50"
            onClick={() => router.push(`/product/${slug}`)}
          >
            <ArrowLeft size={20} /> К товару
          </button>
          <h1 className="text-3xl font-bold mb-8 text-secondary-800">Отзывы о товаре</h1>
          {loading ? (
            <div className="text-secondary-600">Загрузка...</div>
          ) : reviews.length === 0 ? (
            <div className="bg-white rounded-xl p-8 shadow border border-light-200 text-center text-secondary-600 text-lg">
              Пока нет отзывов.
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review._id} className="bg-white rounded-xl p-6 shadow border border-light-200 animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-secondary-800">{review.author}</span>
                    <span className="flex gap-1 text-yellow-500">{Array.from({length: review.rating}).map((_,i) => <Star key={i} size={18} fill="#facc15" stroke="#facc15" />)}</span>
                    <span className="text-secondary-500 text-xs">{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-secondary-700 text-base">{review.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 0.7s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
} 