const mockBusinesses = [
  {
    id: "marseille-resto-1",
    name: "Le Comptoir du Port",
    category: "Restaurant",
    city: "Marseille",
    rating: 4.5,
    reviewCount: 286,
    address: "18 Quai du Port, 13002 Marseille",
    phone: "04 91 11 22 33",
    website: "https://comptoirduport-marseille.fr",
    images: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
      "https://images.unsplash.com/photo-1559339352-11d035aa65de",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
      "https://images.unsplash.com/photo-1552566626-52f8b828add9",
      "https://images.unsplash.com/photo-1551218808-94e220e084d2",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0"
    ],
    description: "Cuisine mediterraneenne, produits frais et ambiance conviviale proche du Vieux-Port."
  },
  {
    id: "marseille-pharmacie-1",
    name: "Pharmacie Saint-Victor",
    category: "Pharmacie",
    city: "Marseille",
    rating: 4.2,
    reviewCount: 174,
    address: "7 Rue Sainte, 13001 Marseille",
    phone: "04 91 44 55 66",
    website: "https://pharmaciesaintvictor.fr",
    images: [
      "https://images.unsplash.com/photo-1471864190281-a93a3070b6de",
      "https://images.unsplash.com/photo-1576671081837-49000212a370",
      "https://images.unsplash.com/photo-1587854692152-cbe660dbde88",
      "https://images.unsplash.com/photo-1585435557343-3b092031a831",
      "https://images.unsplash.com/photo-1582719471384-894fbb16e074",
      "https://images.unsplash.com/photo-1631549916768-4119b4123a0f"
    ],
    description: "Conseils sante, parapharmacie et service de proximite au coeur de Marseille."
  },
  {
    id: "marseille-tabac-1",
    name: "Le Tabac Canebiere",
    category: "Tabac",
    city: "Marseille",
    rating: 4.1,
    reviewCount: 98,
    address: "52 La Canebiere, 13001 Marseille",
    phone: "04 91 77 88 99",
    website: "",
    images: [
      "https://images.unsplash.com/photo-1520166012956-add9ba0835cb",
      "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1",
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef",
      "https://images.unsplash.com/photo-1511920170033-f8396924c348",
      "https://images.unsplash.com/photo-1488900128323-21503983a07e",
      "https://images.unsplash.com/photo-1559561853-08451507cbe7"
    ],
    description: "Tabac, presse et services du quotidien avec accueil rapide et pratique."
  },
  {
    id: "marseille-coiffeur-1",
    name: "Studio Coiffure Prado",
    category: "Coiffeur",
    city: "Marseille",
    rating: 4.7,
    reviewCount: 213,
    address: "103 Avenue du Prado, 13008 Marseille",
    phone: "04 91 22 44 88",
    website: "https://studio-coiffure-prado.fr",
    images: [
      "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f",
      "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388",
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e",
      "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6",
      "https://images.unsplash.com/photo-1560066984-138dadb4c035"
    ],
    description: "Salon expert en coupe, couleur et soins capillaires personnalises."
  },
  {
    id: "lyon-resto-1",
    name: "Le Jardin Gourmand",
    category: "Restaurant",
    city: "Lyon",
    rating: 4.6,
    reviewCount: 328,
    address: "14 Rue Victor Hugo, 69002 Lyon",
    phone: "04 78 00 00 00",
    website: "https://lejardingourmand.fr",
    images: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
      "https://images.unsplash.com/photo-1559339352-11d035aa65de",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
      "https://images.unsplash.com/photo-1552566626-52f8b828add9",
      "https://images.unsplash.com/photo-1551218808-94e220e084d2",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0"
    ],
    description: "Cuisine maison de saison, ambiance conviviale et produits locaux en plein coeur de Lyon."
  },
  {
    id: "nice-hotel-1",
    name: "Hotel Azur Promenade",
    category: "Hotel",
    city: "Nice",
    rating: 4.4,
    reviewCount: 412,
    address: "34 Promenade des Anglais, 06000 Nice",
    phone: "04 93 12 34 56",
    website: "https://hotel-azur-promenade.fr",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945",
      "https://images.unsplash.com/photo-1501117716987-c8e1ecb210e6",
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427"
    ],
    description: "Hotel confortable proche de la Promenade des Anglais, ideal pour sejours business et loisirs."
  }
];

function normalize(value) {
  return (value || "").trim().toLowerCase();
}

async function searchBusinesses(city, type) {
  const cityNorm = normalize(city);
  const typeNorm = normalize(type);

  const results = mockBusinesses.filter((business) => {
    const cityMatch = cityNorm ? normalize(business.city).includes(cityNorm) : true;
    const typeMatch = typeNorm && typeNorm !== "tout" ? normalize(business.category).includes(typeNorm) : true;
    return cityMatch && typeMatch;
  });

  return results;
}

module.exports = {
  searchBusinesses,
};
