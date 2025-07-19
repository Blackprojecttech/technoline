'use client';

import Link from 'next/link';
import { Phone, Mail, MapPin, Facebook, Twitter, Instagram, Youtube, Linkedin } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    company: [
      { name: 'О магазине', href: '/about' },
      { name: 'Контакты', href: '/contact' },
      { name: 'Ремонт', href: '/repair' },
      { name: 'Отзывы', href: '/reviews' },
      { name: 'Гарантии', href: '/warranty' },
    ],
    support: [
      { name: 'Оплата', href: '/payment' },
      { name: 'Доставка и Самовывоз', href: '/delivery' },
      { name: 'Опт и вопросы по сотрудничеству', href: '/wholesale' },
      { name: 'Связь с администрацией', href: '/admin-contact' },
    ],
    legal: [
      { name: 'Политика конфиденциальности', href: '/privacy' },
      { name: 'Условия использования', href: '/terms' },
      { name: 'Политика возврата', href: '/return-policy' },
      { name: 'Правила безопасности', href: '/security' },
    ],
  };

  const socialLinks = [
    { name: 'Facebook', href: '#', icon: Facebook },
    { name: 'Twitter', href: '#', icon: Twitter },
    { name: 'Instagram', href: '#', icon: Instagram },
    { name: 'YouTube', href: '#', icon: Youtube },
    { name: 'LinkedIn', href: '#', icon: Linkedin },
  ];

  return (
    <footer className="relative bg-gradient-to-br from-primary-50 via-light-50 to-accent-50 text-secondary-800">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary-200/20 rounded-full -translate-x-32 -translate-y-32"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-200/20 rounded-full translate-x-32 translate-y-32"></div>
      </div>

      <div className="relative z-10">
        {/* Main footer content */}
        <div className="container mx-auto px-4 py-16 max-w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company info */}
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center mb-6">
                <img 
                  src="/logo.png" 
                  alt="TechnoLine Logo" 
                  className="h-10 w-auto"
                />
              </Link>
              
              <p className="text-secondary-600 mb-6 max-w-md">
                Ваш надежный партнер в мире технологий. Мы предлагаем широкий ассортимент качественной электроники с гарантией и отличным сервисом.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Phone size={20} className="text-primary-500" />
                  <span className="text-secondary-700">+7(499)3223386</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail size={20} className="text-primary-500" />
                  <span className="text-secondary-700">support@techno-line.store</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin size={20} className="text-primary-500" />
                  <span className="text-secondary-700">Москва, Пятницкое шоссе, 18, Павильон 73. 1 этаж, 3 вход, прямо до конца, возле Mix Bar.</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-secondary-600 text-sm">с 10:00 до 19:00</span>
                </div>
              </div>
            </div>

            {/* Company links */}
            <div>
              <h3 className="text-lg font-semibold text-secondary-800 mb-4">Компания</h3>
              <ul className="space-y-2">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href}
                      className="text-secondary-600 hover:text-primary-600 transition-colors duration-200"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support links */}
            <div>
              <h3 className="text-lg font-semibold text-secondary-800 mb-4">Поддержка</h3>
              <ul className="space-y-2">
                {footerLinks.support.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href}
                      className="text-secondary-600 hover:text-primary-600 transition-colors duration-200"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Newsletter signup */}
          <div className="mt-12 pt-8 border-t border-light-300">
            <div className="max-w-md">
              <h3 className="text-lg font-semibold text-secondary-800 mb-4">
                Подпишитесь на новости
              </h3>
              <div className="flex space-x-2">
                <input
                  type="email"
                  placeholder="Ваш email"
                  className="flex-1 px-4 py-2 bg-white border border-light-300 rounded-lg text-secondary-700 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent shadow-sm"
                />
                <button className="px-6 py-2 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg">
                  Подписаться
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom footer */}
        <div className="border-t border-light-300">
          <div className="container mx-auto px-4 py-6 max-w-full">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              {/* Copyright */}
              <div className="text-secondary-600 text-sm">
                © {currentYear} TechnoLine. Все права защищены.
              </div>

              {/* Social links */}
              <div className="flex items-center space-x-4">
                {socialLinks.map((social) => {
                  const IconComponent = social.icon;
                  return (
                    <Link
                      key={social.name}
                      href={social.href}
                      className="w-10 h-10 bg-white hover:bg-primary-50 rounded-full flex items-center justify-center text-secondary-600 hover:text-primary-600 transition-all duration-200 hover:scale-110 shadow-sm border border-light-200"
                    >
                      <IconComponent size={20} />
                    </Link>
                  );
                })}
              </div>

              {/* Legal links */}
              <div className="flex items-center space-x-6 text-sm">
                {footerLinks.legal.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-secondary-600 hover:text-primary-600 transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 