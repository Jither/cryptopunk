function isStorageAvailable()
{
	try
	{
		const storage = window.localStorage;
		const test = "__STORAGETEST__";
		storage.setItem(test, test);
		storage.removeItem(test, test);
		return true;
	}
	catch (e)
	{
		return false;
	}
}

export {
	isStorageAvailable
};