import Head from 'next/head';
import data from '../lib/data';
import Post from '../components/post';

const Index = ({ pages }) => (
	<>
		<Head>
			<title>Next.js + SharePoint Online</title>
			<link rel="stylesheet" href="https://css.zeit.sh/v1.css" type="text/css" />
		</Head>
		{pages.length > 0 ? pages.map((p) => <Post key={p.id} page={p} />) : null}
	</>
);

export async function getStaticProps() {
	return {
		props: {
			pages: data,
		},
	};
}

export default Index;
