import { weakEtagMatch } from '../src/etag-match';

test('matches with a weak etag', () => {
	const r = weakEtagMatch('W/"abc"', 'W/"abc"');
	expect(r).toBeTruthy();
});

test('matches with an implicit weak etag', () => {
	const r = weakEtagMatch('"abc"', 'W/"abc"');
	expect(r).toBeTruthy();
});

test('matches from a list of weak etags', () => {
	const r = weakEtagMatch('W/"def", W/"abc"', 'W/"abc"');
	expect(r).toBeTruthy();
});

test('matches from a list of implicit weak etags', () => {
	const r = weakEtagMatch('"def", "abc"', 'W/"abc"');
	expect(r).toBeTruthy();
});

test('matches with an asterisk', () => {
	const r = weakEtagMatch('*', 'W/"abc"');
	expect(r).toBeTruthy();
});

test('matches with an asterisk in a list', () => {
	const r = weakEtagMatch('"def", *', 'W/"abc"');
	expect(r).toBeTruthy();
});

test('no match with a differing etag', () => {
	const r = weakEtagMatch('W/"def"', 'W/"abc"');
	expect(r).toBeFalsy();
});

test('no match with a differing implicit etag', () => {
	const r = weakEtagMatch('"def"', 'W/"abc"');
	expect(r).toBeFalsy();
});

test('no match with an invalid differing etag', () => {
	const r = weakEtagMatch('W/def"', 'W/"abc"');
	expect(r).toBeFalsy();
});

test('no match with an invalid differing implicit etag', () => {
	const r = weakEtagMatch('"def', 'W/"abc"');
	expect(r).toBeFalsy();
});
