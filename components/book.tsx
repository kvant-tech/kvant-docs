import { Stack } from './stack';
import { useMemo } from 'react';

type BookVariant = 'simple' | 'stripe';

const Spine = () => {
  return (
    <div
      style={{
        minWidth: '8.2%',
        background: ' var(--bg-shadow)',
        opacity: 1,
        height: '100%',
        width: '8.2%',
        mixBlendMode: 'overlay',
      }}
    />
  );
};

const Pages = () => {
  return (
    <div
      className="book-pages"
      style={{
        height: 'calc(100% - 2 * 3px)',
        width: 'calc(var(--book-depth) - 2px)',
        top: '3px',
        position: 'absolute',
        transform:
          'translateX(calc(var(--book-width) * 1px - var(--book-depth) / 2 - 3px)) rotateY(90deg) translateX(calc(var(--book-depth) / 2))',
        background:
          'linear-gradient(90deg, #eaeaea, transparent 70%), linear-gradient(#fff, #fafafa)',
      }}
    />
  );
};

const BookBack = () => {
  return (
    <div
      className="book-back"
      style={{
        position: 'absolute',
        left: 0,
        width: 'calc(var(--book-width) * 1px)',
        height: '100%',
        borderRadius: 'var(--book-border-radius)',
        transform: 'translateZ(calc(-1 * var(--book-depth)))',
        backgroundColor: 'var(--ds-red-200)',
        background: 'var(--book-color)',
      }}
    />
  );
};

export function Book({
  title,
  width = 196,
  color = 'oklch(75.04% 0.1737 74.49)',
  textColor = 'var(--x-color-nextra-text)',
  textured = false,
  variant = 'stripe',
  textureAssetUrl = 'url(/images/book-texture.avif)',
  illustration,
  flat = false,
  link,
}: {
  title: string;
  width?: number;
  color?: string;
  textColor?: string;
  textured?: boolean;
  variant?: BookVariant;
  illustration?: React.ReactNode;
  textureAssetUrl?: string;
  flat?: boolean;
  link?: string;
}) {
  const { shouldRotate } = useMemo(
    () =>
      textured
        ? {
            shouldRotate: Math.random() > 0.5,
          }
        : {
            shouldRotate: false,
          },
    [textured]
  );

  const BookContent = () => (
    <div
      style={
        {
          ...book,
          '--book-width': width,
          '--book-color': color,
          '--book-text-color': textColor,
          '--texture-asset': textureAssetUrl,
        } as React.CSSProperties
      }
    >
      {/* rotate wrapper */}
      <div
        style={rotateWrapper}
        className="hover:[transform:rotateY(var(--hover-rotate))_scale(var(--hover-scale))_translateX(var(--hover-translate-x))]"
      >
        {/* cover stack */}
        <Stack
          style={
            {
              position: 'absolute',
              minWidth: 'calc(var(--book-width) * 1px)',
              ...bookCover,
              background:
                variant === 'simple'
                  ? color
                  : 'linear-gradient(180deg,hsla(0,0%,100%,.1),hsla(0,0%,100%,0) 50%,hsla(0,0%,100%,0)),var(--x-color-nextra-bg)',
            } as React.CSSProperties
          }
        >
          {/* top cover */}
          <Stack style={bookstripe}>
            <div className="object-cover"></div>
            <Spine />
          </Stack>
          {/* bottom cover */}
          <Stack direction={'row'} style={bookBody(variant)}>
            <Spine />
            {/* text */}
            <Stack
              style={
                {
                  ...bookBodyText,
                } as React.CSSProperties
              }
            >
              <span style={bookTitle}>{title}</span>
              {illustration ? illustration : ''}
            </Stack>
          </Stack>
          {textured && (
            <div
              style={{
                ...booktexture,
                transform: shouldRotate ? 'rotate(180deg)' : 'rotate(0deg',
              }}
            ></div>
          )}
        </Stack>

        {flat === false && (
          <>
            <Pages />
            <BookBack />
          </>
        )}
      </div>
    </div>
  );

  if (link) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        <BookContent />
      </a>
    );
  }

  return <BookContent />;
}

const book: React.CSSProperties = {
  perspective: '900px',
  '--book-default-width': '196',
  '--book-color': 'hsl(var(--ds-amber-600))',
  '--book-text-color': 'hsl(var(--ds-gray-1000))',
  '--book-depth': '29cqw',
  '--book-border-radius': '6px 4px 4px 6px',
  '--hover-rotate': '-20deg',
  '--hover-scale': '1.066',
  '--hover-translate-x': '-8px',
  '--aspect-ratio': '49 / 60',
  '--bg-shadow':
    'linear-gradient(90deg, hsla(0, 0%, 100%, 0), hsla(0, 0%, 100%, 0) 12%, hsla(0, 0%, 100%, .25) 29.25%, hsla(0, 0%, 100%, 0) 50.5%, hsla(0, 0%, 100%, 0) 75.25%, hsla(0, 0%, 100%, .25) 91%, hsla(0, 0%, 100%, 0)), linear-gradient(90deg, rgba(0, 0, 0, .03), rgba(0, 0, 0, .1) 12%, transparent 30%, rgba(0, 0, 0, .02) 50%, rgba(0, 0, 0, .2) 73.5%, rgba(0, 0, 0, .5) 75.25%, rgba(0, 0, 0, .15) 85.25%, transparent)',
  cursor: 'pointer',
} as React.CSSProperties;

const rotateWrapper: React.CSSProperties = {
  '--book-width': 'var(--book-default-width)',
  aspectRatio: 'var(--aspect-ratio)',
  width: 'fit-content',
  position: 'relative',
  transformStyle: 'preserve-3d',
  minWidth: 'calc(var(--book-width) * 1px)',
  transition: 'transform .25s ease-out',
  containerType: 'inline-size',
} as React.CSSProperties;

const bookCover: React.CSSProperties = {
  borderRadius: 'var(--book-border-radius)',
  width: 'calc(var(--book-width) * 1px)',
  height: '100%',
  overflow: 'hidden',
  background:
    'linear-gradient(180deg,hsla(0,0%,100%,.1),hsla(0,0%,100%,0) 50%,hsla(0,0%,100%,0)),#1f1f1f',
  boxShadow:
    '0 1.8px 3.6px rgba(0,0,0,.05),0 10.8px 21.6px rgba(0,0,0,.08),inset 0 -.9px 0 rgba(0,0,0,.1),inset 0 1.8px 1.8px hsla(0,0%,100%,.1),inset 3.6px 0 3.6px rgba(0,0,0,.1)',
};

const bookstripe: React.CSSProperties = {
  background: 'var(--book-color)',
  width: '100%',
  position: 'relative',
  flex: '1 1',
  overflow: 'hidden',
};

const bookBody = (variant: BookVariant) => ({
  width: '100%',
  height: variant === ('simple' as BookVariant) ? '100%' : undefined,
});

const bookBodyText: React.CSSProperties = {
  gap: 'calc((24px / var(--book-default-width))* var(--book-width))',
  padding: '6.1%',
  paddingBottom: 'calc(6.1% + 1rem)',
  containerType: 'inline-size',
  width: '100%',
};

const bookTitle: React.CSSProperties = {
  '--text-color': 'var(--ds-gray-1000)',
  '--text-size': '0.875rem',
  '--text-line-height': '1.25rem',
  '--text-letter-spacing': 'initial',
  '--text-weight': '600',

  lineHeight: '1.25em',
  fontSize: '10.5cqw',
  letterSpacing: '-.02em',
  fontWeight: 'var(--text-weight)',

  textWrap: 'balance',
  color: 'var(--book-text-color)',
} as React.CSSProperties;

const booktexture: React.CSSProperties = {
  backgroundImage: 'var(--texture-asset)',
  backgroundSize: 'cover',
  position: 'absolute',
  inset: 0,
  borderRadius: 'var(--book-border-radius)',
  mixBlendMode: 'hard-light',
  backgroundRepeat: 'no-repeat',
  opacity: 0.5,
  pointerEvents: 'none',
  filter: 'brightness(1.1)',
};
