import { useRouter } from 'next/router';
import ErrorPage from 'next/error';
import data from '../../lib/data';

const Page = ({ page }) => {
	const router = useRouter();

	if (router.isFallback) {
		return <div>Loading...</div>;
	}

	if (!page) {
		return <ErrorPage statusCode={404} />;
	}

	return (
		<>
			<h1>{page.title}</h1>
			<p>{page.body}</p>
		</>
	);
};

export async function getStaticPaths() {
	return {
		paths: data.map((p) => `/post/${p.id}`),
		fallback: true,
	};
}

export async function getStaticProps({ params }) {
	let page = data.find((p) => p.id === Number(params.pid));

	if (!page) {
		page = {
			id: params.pid,
			title: `Page generated for ${params.pid}`,
			body: 'Nothing to see here.',
		};
	}

	await new Promise((r) => setTimeout(r, 40));

	return { props: { page } };
}

export default Page;
