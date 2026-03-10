const mockBusinesses = [
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
    id: "lyon-plombier-1",
    name: "Depannage Express Habitat",
    category: "Plombier",
    city: "Lyon",
    rating: 4.3,
    reviewCount: 119,
    address: "42 Avenue Berthelot, 69007 Lyon",
    phone: "04 72 00 00 00",
    website: "https://depannage-express-habitat.fr",
    images: [
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952",
      "https://images.unsplash.com/photo-1621905251918-48416bd8575a",
      "https://images.unsplash.com/photo-1585704032915-c3400ca199e7",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858",
      "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6",
      "https://images.unsplash.com/photo-1600566752227-8f3b43ea0be9"
    ],
    description: "Interventions rapides 7j/7 pour depannage, entretien et installation de plomberie."
  },
  {
    id: "paris-coiffure-1",
    name: "Atelier Coiffure Bastille",
    category: "Salon de coiffure",
    city: "Paris",
    rating: 4.8,
    reviewCount: 267,
    address: "9 Rue de la Roquette, 75011 Paris",
    phone: "01 43 00 00 00",
    website: "https://atelier-coiffure-bastille.fr",
    images: [
      "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f",
      "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388",
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e",
      "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6",
      "https://images.unsplash.com/photo-1560066984-138dadb4c035"
    ],
    description: "Coupe, couleur et soins personnalises dans un salon moderne au coeur du 11e arrondissement."
  },
  {
    id: "marseille-hotel-1",
    name: "Hotel Vieux Port Horizon",
    category: "Hotel",
    city: "Marseille",
    rating: 4.4,
    reviewCount: 412,
    address: "21 Quai du Port, 13002 Marseille",
    phone: "04 91 00 00 00",
    website: "",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945",
      "https://images.unsplash.com/photo-1501117716987-c8e1ecb210e6",
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427"
    ],
    description: "Hotel confortable proche du Vieux-Port, ideal pour sejours business et loisirs."
  }
];

function normalize(value) {
  return (value || "").trim().toLowerCase();
}

async function searchBusinesses(city, category) {
  const cityNorm = normalize(city);
  const categoryNorm = normalize(category);

  const results = mockBusinesses.filter((business) => {
    const cityMatch = cityNorm ? normalize(business.city).includes(cityNorm) : true;
    const categoryMatch = categoryNorm ? normalize(business.category).includes(categoryNorm) : true;
    return cityMatch && categoryMatch;
  });

  return results;
}

module.exports = {
  searchBusinesses,
};
