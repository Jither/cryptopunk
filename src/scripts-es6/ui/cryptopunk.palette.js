import { Signal } from "../jither.signals";

class PaletteCategory
{
	constructor(palette, caption)
	{
		this.palette = palette;
		this.element = document.createElement("div");

		const header = document.createElement("h1");
		header.innerText = caption;
		this.element.appendChild(header);
		
		this.eleList = document.createElement("ul");
		this.element.appendChild(this.eleList);
	}

	addItem(data, id, menuCaption, caption)
	{
		caption = caption || menuCaption;
		const item = document.createElement("li");

		const btn = document.createElement("a");
		btn.href = "#";
		btn.innerText = menuCaption;

		btn.addEventListener("click", this.itemClicked.bind(this, { caption, data }));

		this.palette._addClass(id, data);

		item.appendChild(btn);
		this.eleList.appendChild(item);

		return this;
	}

	itemClicked(data, event)
	{
		event.preventDefault();
		this.palette.onItemClicked(data);
	}
}

class Palette
{
	constructor(element)
	{
		this._classes = {};
		this.element = element;
		this.itemClicked = new Signal();
	}

	_addClass(id, definition)
	{
		definition.id = id;
		this._classes[id] = definition;
	}

	getClass(id)
	{
		return this._classes[id];
	}

	addCategory(caption)
	{
		const category = new PaletteCategory(this, caption);
		this.element.appendChild(category.element);
		return category;
	}

	onItemClicked(item)
	{
		this.itemClicked.dispatch(item);
	}
}

export {
	Palette
};