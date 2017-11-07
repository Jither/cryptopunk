class Cache
{
	constructor()
	{
		this.cache = {};
	}

	get(key)
	{
		return this.cache[key];
	}

	getOrAdd(key, factory)
	{
		if (this.cache[key] === undefined)
		{
			this.cache[key] = factory();
		}
		return this.cache[key];
	}

	set(key, value)
	{
		this.cache[key] = value;
	}

	remove(key)
	{
		delete this.cache[key];
	}
}

export default new Cache();