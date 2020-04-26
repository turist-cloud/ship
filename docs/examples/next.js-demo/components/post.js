import Link from 'next/link';

function Post({ page }) {
	const { id: pageId, title: pageTitle } = page;

	return (
		<div className="container">
			<div className="text">
				<h2>
					<Link href={`/post/${pageId}`}>
						<a>{pageTitle}</a>
					</Link>
				</h2>
			</div>
		</div>
	);
}

export default Post;
