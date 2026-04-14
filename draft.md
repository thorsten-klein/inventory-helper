I want to write a Website that I can host via Github Pages..
On the website the user shall be able to load a xlsx file.
For example EXPORT_Links.XLSX.

This file is parsed.

The user can then select a column where the categories are. Default shall be F.
The user can select the column for EAN (default is C).
The user can select the column for shelf (default is G).
The user can select the column for row (default is D).
The user can select the column for position (default is E).
The user can select the column for Article number (default is I).
The user can select the column for price (default is L).
The user can select the column for stock (default is S).

He can then select one category in a dropdown that he wants to check (one of the values from accordung categories column).

The website then shows a list of all the articles from this category
EAN                 | shelf | row | position
article number      | 

The user has the change to reorder the items in this list.
There is a + button to add a completely new item to the end of the list. Only EAN and shelf shall be mandatory.
When clicking on a item in the list, the item is selected.
In the bottom a button "Row +" and "Row - " appear.
Also buttons "Move Up" and "Move Down" appear.
A button "Edit" appears. When clicking on this Edit button, a small window opens where the user can change the shelf (freetext).
Once the user is finished, he can click on Next.
The list shall always be ordered correctly: Start with all items in row 1 in according positions order, then all items from next row, ...
If there are multiple shelf values, the next shelf is shown in same order.
On the next screen the following data is shown (all centered):

Heading (big): category name
EAN
Article Number
stock (big)
Price
shelf | row | position

In the bottom there are two buttons "Previous" and "Next".
By clicking on Next, the next item is shown.
By clicking on Previous, the previous item is shown again.
Next to the stock there is a + and - button to adapt the stock.

Once all is done, a report is shown.
It contains the columns:
EAN | Row | article nr | Stock | Stock Diff
By clicking on a "Export" button, the report can be exported.
The report shall be named <category>-<datetime>.xlsx

