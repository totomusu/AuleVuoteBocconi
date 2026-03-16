# 📚 AuleVuoteBocconi



*AuleVuoteBocconi* is a tool that helps you find empty classrooms at Bocconi University that are not marked as **official study rooms** in the website https://didattica.unibocconi.it/aule/lista_orario.php. It analyzes the lecture schedule from the official Bocconi website and shows available rooms in real time.

---

## ✅ Requirements

- [Node.js](https://nodejs.org/) installed on your machine
- The following npm packages:

```bash
npm install axios cheerio
```

---

## 🚀 Getting Started

1. Clone or download the project.
2. Run the following script to fetch the current day’s class schedule:

```bash
node fetch_orario.js
```

This script will retrieve the latest classroom schedule from Bocconi's official website and store it in:

```
/public/cache_orario.json
```

---

## 🔁 Automatic Updates (Optional)

To keep your schedule data always up to date, you can automate the script using `cron` to run every 30 minutes.

1. Open your crontab editor:

```bash
crontab -e
```

2. Add the following line at the end of the file (update the path if needed):

```bash
*/30 * * * * /usr/local/bin/node /absolute/path/to/fetch_orario.js >> /absolute/path/to/orario.log 2>&1
```

3. Save and exit using `CTRL+X`, then confirm with `Y` and `ENTER`.

---

## 🌐 Viewing the Schedule

Once the `cache_orario.json` file is updated, simply open `index.html` with a Web Server, like the one in VS Code or Apache2 or Nginx.

You’ll see a list of all currently free classrooms in the university where you can study peacefully—without needing to go to a crowded study room.

---

## 📄 License

This project is open-source. Feel free to modify or improve it!












