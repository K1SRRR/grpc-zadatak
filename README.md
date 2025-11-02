# 🚀 gRPC User Service - Node.js

Kompletna gRPC aplikacija za upravljanje korisničkim nalozima implementirana u Node.js sa Docker podrškom.

## 📋 Pregled

Ova aplikacija demonstrira CRUD operacije preko gRPC protokola:
- **CreateUser** - Kreiranje novog korisnika (uz proveru email adrese)
- **GetUsers** - Preuzimanje korisnika (uz filtriranje)
- **DeleteUser** - Brisanje korisnika

## 🛠️ Tehnologije

- **Node.js 18** - Runtime environment
- **@grpc/grpc-js** - gRPC implementacija za Node.js
- **@grpc/proto-loader** - Protocol Buffers loader
- **PostgreSQL** - Relaciona baza podataka
- **Docker** - Kontejnerizacija
- **Docker Compose** - Multi-container orkestracija

## 📦 Pokretanje aplikacije

- Radimo iz foldera projekta:

```powershell
cd C:\Users\srdja\Desktop\zadatak
```

- Pokreni server i klijenta zajedno (build i start):

```powershell
docker-compose up --build
```

- Pokretanje u detached modu (u pozadini):

```powershell
docker-compose up -d --build
```

- Pokreni samo server:

```powershell
docker-compose up --build user-service-server
```

- Pokreni samo klijent (prethodno pokreni server):

```powershell
docker-compose up --build user-service-client
```

Za zaustavljanje svih servisa:

```powershell
docker-compose down
```

Za potpuno čišćenje (uključuje brisanje volume-a):

```powershell
docker-compose down -v
```

## 🎥 Video demonstracija

[![Video demonstracija - gRPC User Service](https://img.youtube.com/vi/viWvYNskk7s/0.jpg)](https://www.youtube.com/watch?v=viWvYNskk7s)

Kratka video demonstracija pokazuje rad ovog gRPC User Service-a: pokretanje servera i klijenta, kreiranje i dobavljanje korisnika, brisanje naloga pomoću Docker Compose-a.

Direktno na YouTube-u: https://www.youtube.com/watch?v=viWvYNskk7s