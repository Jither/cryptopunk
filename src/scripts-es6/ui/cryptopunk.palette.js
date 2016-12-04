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

	addItem(data, menuCaption, caption)
	{
		caption = caption || menuCaption;
		const item = document.createElement("li");
		const btn = document.createElement("a");
		btn.href = "#";
		btn.innerText = menuCaption;
		btn.addEventListener("click", this.itemClicked.bind(this, { caption: caption, data: data }));

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
		this.element = element;
		this.itemClicked = new Signal();
	}

	addCategory(caption)
	{
		const category = new PaletteCategory(this, caption);
		this.element.appendChild(category.element);
		return category;
	}

	onItemClicked(item)
	{
		this.itemClicked.dispatch(item.data, item.caption);
	}
}

export {
	Palette
};