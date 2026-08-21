# Cyrus Panel Frontend

> The modern web interface powering Cyrus Panel. Built for intuitive server management, infrastructure control, and a fast, responsive experience.

[![License](https://img.shields.io/github/license/HasenDev/cyrus-frontend)](https://github.com/HasenDev/cyrus-frontend/blob/main/LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/HasenDev/cyrus-frontend?style=flat)](https://github.com/HasenDev/cyrus-frontend/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/HasenDev/cyrus-frontend)](https://github.com/HasenDev/cyrus-frontend/issues)

## Setting up the environment

Cyrus Panel Frontend requires **Node.js v21 or newer**.

**Node.js v24.19.0 is the currently tested version**, but it is not required.

### Install with NVM

```bash id="x1k1yb"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 24.19.0
nvm use 24.19.0
```

### Or install using your Linux distribution

**Debian / Ubuntu**

```bash id="5frgct"
sudo apt update
sudo apt install -y nodejs npm
```

**Fedora / RHEL / Rocky / AlmaLinux**

```bash id="t4d0eq"
sudo dnf install -y nodejs npm
```

**Arch Linux**

```bash id="k2w7la"
sudo pacman -S nodejs npm
```

> Make sure your installed Node.js version is **v21 or newer**.

## Installation

Clone the repository and install the dependencies:

```bash id="bvl2tx"
git clone https://github.com/HasenDev/cyrus-frontend.git
cd cyrus-frontend
npm install
```

## Building

Build the frontend with:

```bash id="5q7k8j"
npm run build
```

This generates the static exported Next.js frontend inside the `/out` directory.

The generated files are standard HTML, JavaScript, CSS, and other static assets that can be served by a web server or integrated into Cyrus Panel.

## Development

Run the frontend in development mode with:

```bash id="0w5p4f"
npm run dev
```

This starts the Next.js development server with hot reloading.

## Links

* **Website:** https://cyrus.admibot.xyz
* **Documentation:** https://cyrus.admibot.xyz/docs
* **Bug Reports:** https://cyrus.admibot.xyz/bugs
* **Support Server:** https://discord.gg/3yuMkSnrFd

## License

See the [LICENSE](https://github.com/HasenDev/cyrus-frontend/blob/main/LICENSE) file.
