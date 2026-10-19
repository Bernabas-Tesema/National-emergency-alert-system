class Citizen {
  const Citizen({
    required this.id,
    required this.phone,
    required this.registeredRegion,
  });

  final String id;
  final String phone;
  final String registeredRegion;

  factory Citizen.fromJson(Map<String, dynamic> json) => Citizen(
        id: json['id'] as String,
        phone: json['phone'] as String,
        registeredRegion: (json['registeredRegion'] as String?) ?? '',
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'phone': phone,
        'registeredRegion': registeredRegion,
      };
}