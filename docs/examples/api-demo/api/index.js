module.exports = (req, res) => {
	res.end(`Hello world!!! ${req.method}\n${JSON.stringify(process.env)}`);
}
