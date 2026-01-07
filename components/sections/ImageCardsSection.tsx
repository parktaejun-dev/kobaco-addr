import React from 'react';

interface ImageCard {
  image?: string;
  title?: string;
  description?: string;
}

interface ImageCardsSectionProps {
  data: {
    title?: string;
    titleSize?: string;
    titleColor?: string;
    subtitle?: string;
    cards?: ImageCard[];
  };
}

export default function ImageCardsSection({ data }: ImageCardsSectionProps) {
  if (!data) return null;

  // Font size mappings (reusing patterns from other sections)
  const titleSizeClasses: Record<string, string> = {
    sm: 'text-2xl sm:text-3xl',
    md: 'text-3xl sm:text-4xl',
    lg: 'text-4xl sm:text-5xl',
    xl: 'text-5xl sm:text-6xl',
  };
  
  // Font color mappings
  const colorClasses: Record<string, string> = {
    white: 'text-white',
    slate: 'text-slate-900',
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
  };

  const titleSizeClass = titleSizeClasses[data.titleSize || 'md'];
  const titleColorClass = colorClasses[data.titleColor || 'slate'];

  return (
    <section className="section-pad bg-white overflow-hidden">
      <div className="section-wrap">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          {data.title && (
            <h2 className={`${titleSizeClass} ${titleColorClass} font-extrabold tracking-tight text-balance`}>
              {data.title.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < data.title!.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </h2>
          )}
          {data.subtitle && (
            <p className="text-lg text-slate-600 leading-relaxed text-balance">
              {data.subtitle.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < data.subtitle!.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          )}
        </div>

        {/* Cards Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.cards?.map((card, i) => (
            <div key={i} className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-slate-100">
              {/* Image Area */}
              <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                {card.image ? (
                  <img
                    src={card.image}
                    alt={card.title || 'Section image'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <span className="text-sm font-medium">No Image</span>
                  </div>
                )}
              </div>
              
              {/* Content Area */}
              {(card.title || card.description) && (
                <div className="p-6 space-y-2 flex-1 flex flex-col">
                  {card.title && (
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {card.title}
                    </h3>
                  )}
                  {card.description && (
                    <p className="text-sm text-slate-600 leading-relaxed flex-1">
                      {card.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
