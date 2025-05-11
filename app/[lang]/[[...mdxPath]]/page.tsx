import { generateStaticParamsFor, importPage } from 'nextra/pages';
import { useMDXComponents as getMDXComponents } from '../../../mdx-components';
import { MetaRecord } from 'nextra';

export const generateStaticParams = generateStaticParamsFor('mdxPath');
const Wrapper = getMDXComponents().wrapper;

export type PageProps = {
  params: Promise<{
    mdxPath: string[] | undefined;
    lang: string | undefined;
  }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<MetaRecord> {
  const { lang, mdxPath } = await params;
  const { metadata } = await importPage(mdxPath, lang);
  return metadata;
}

export default async function Page({ params }: PageProps) {
  const { lang, mdxPath } = await params;
  const result = await importPage(mdxPath, lang);
  const { default: MDXContent, toc, metadata } = result;
  return (
    <Wrapper toc={toc} metadata={metadata}>
      <MDXContent params={params} />
    </Wrapper>
  );
}
