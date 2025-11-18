export interface Cafeteria {
  id: string;
  name: string;
  location: string;
  description: string;
  image: string;
  rating: number;
  estimatedTime: string;
  isOpen: boolean;
  category: string;
}

export const cafeterias: Cafeteria[] = [
  {
    id: '1',
    name: 'Sdap Kitchen',
    location: 'Arked Angkasa',
    description: 'Popular for Nasi Lemak and local delights',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTA1bBYahghWetnXzUAQg7Py1auc3ywlT56Jw&s',
    rating: 4.5,
    estimatedTime: '15-20 min',
    isOpen: true,
    category: 'Malaysian',
  },
  {
    id: '2',
    name: 'Tok Janggut Cafe',
    location: 'Scholar Inn',
    description: 'Western and Asian fusion cuisine',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSjN80oRsRWFMwUn0lsKpSd6BPg-kiRY1fswQ&s',
    rating: 4.3,
    estimatedTime: '10-15 min',
    isOpen: true,
    category: 'Western',
  },
  {
    id: '3',
    name: 'Pak Lah Cafe',
    location: '',
    description: 'Best chicken rice and drinks on campus',
    image: 'https://lh3.googleusercontent.com/gps-cs-s/AG0ilSxc2OKZ_-3H3tUFJJIinRP189crOtOFSluQct7JIyX2ND05LyVXceeb-6MlkDFYoQKo2Mt8LO89Y8kEkhe3h3aynqVlMvqrw-bTs6EJSkzDFONGdCYzcuLIbhKMZlUyFiOm6sB3=s1360-w1360-h1020-rw',
    rating: 4.7,
    estimatedTime: '12-18 min',
    isOpen: true,
    category: 'Malaysian',
  },
  {
    id: '4',
    name: 'Deen Corner',
    location: 'Arked Cengal',
    description: 'Variety of noodles and rice dishes',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT2YCw_MmNlJsZqgPbrWRzZ70ZUs4tIcf5-AQ&s',
    rating: 4.2,
    estimatedTime: '15-25 min',
    isOpen: true,
    category: 'Asian',
  },
  {
    id: '5',
    name: 'He and She Coffee',
    location: 'UTM Library',
    description: 'Healthy options and vegetarian meals',
    image: 'https://static.wixstatic.com/media/951be0_546fc4c361f24591a64f516f9944e4f1~mv2.jpeg',
    rating: 4.4,
    estimatedTime: '10-12 min',
    isOpen: false,
    category: 'Healthy',
  },
  {
    id: '6',
    name: 'Cafe Syantik',
    location: 'KDSE',
    description: 'Famous for breakfast and supper',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT-e_m-Svj8XtCkaWSpAVv3Ze0ldboN1RkznQ&s',
    rating: 4.6,
    estimatedTime: '8-15 min',
    isOpen: true,
    category: 'Malaysian',
  },
];
