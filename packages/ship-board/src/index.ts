#!/usr/bin/env node
import { join as pathJoin } from 'path';
import Adal from './adal';
import { readConfig } from './config';
import uploadFiles from './upload-files';
import { createFolder, renameFolder } from './folders';
import { CONFIG_PATH } from './config';

async function run() {
	const config = readConfig(CONFIG_PATH); // TODO path as an arg or env?
	const adal = new Adal(config.authorityHostUrl, config.tenant, config.clientId);

	const deploymentPath = process.argv[2] || process.cwd();
	process.chdir(deploymentPath);

	console.error(`Boarding "${deploymentPath}" to "${config.domain}"`);

	// Create a new domain folder
	const tempFolderName = `${config.domain}-staging-${Date.now() / 1000}`;
	await createFolder(adal, config.spoRoot, tempFolderName);

	// Upload project files
	try {
		await uploadFiles(adal, `${pathJoin(config.spoRoot, tempFolderName)}`);
	} catch (err) {
		console.error(err.message);
		process.exit(1);
	}

	// Swap the old domain folder to a new one
	try {
		const oldName = config.domain;
		const newName = `${config.domain}-old-${Date.now()}`;

		await renameFolder(adal, config.spoRoot, oldName, newName);
		console.error(`Renamed ${oldName} to ${newName}`);
	} catch (err) {
		/* NOP Maybe there was no `oldName` */
	}
	await renameFolder(adal, config.spoRoot, tempFolderName, config.domain);

	console.error('Boarding complete');

	// Something keeps me up
	process.exit(0);
}

run().catch(console.error);
