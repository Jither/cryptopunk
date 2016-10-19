class Signal
{
	constructor()
	{
		this.listeners = [];
	}

	add(listener)
	{
		if (this.listeners.indexOf(listener) >= 0)
		{
			return;
		}
		this.listeners.push(listener);
	}

	remove(listener)
	{
		const index = this.listeners.indexOf(listener);
		if (index >= 0)
		{
			this.listeners.splice(index, 1);
		}
	}

	dispatch(...args)
	{
		const listeners = this.listeners.concat();
		for (let i = 0; i < listeners.length; i++)
		{
			listeners[i](...args);
		}
	}
}

export {
	Signal
};