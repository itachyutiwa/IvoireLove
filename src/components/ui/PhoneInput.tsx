import React, { forwardRef, useState, useEffect } from 'react';
import { IoChevronDown } from 'react-icons/io5';

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: 'CI', name: 'Côte d\'Ivoire', dialCode: '+225', flag: '🇨🇮' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'SN', name: 'Sénégal', dialCode: '+221', flag: '🇸🇳' },
  { code: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫' },
  { code: 'GN', name: 'Guinée', dialCode: '+224', flag: '🇬🇳' },
  { code: 'TG', name: 'Togo', dialCode: '+228', flag: '🇹🇬' },
  { code: 'BJ', name: 'Bénin', dialCode: '+229', flag: '🇧🇯' },
  { code: 'CM', name: 'Cameroun', dialCode: '+237', flag: '🇨🇲' },
  { code: 'CD', name: 'RD Congo', dialCode: '+243', flag: '🇨🇩' },
  { code: 'GA', name: 'Gabon', dialCode: '+241', flag: '🇬🇦' },
  { code: 'CG', name: 'Congo', dialCode: '+242', flag: '🇨🇬' },
  { code: 'TD', name: 'Tchad', dialCode: '+235', flag: '🇹🇩' },
  { code: 'CF', name: 'RCA', dialCode: '+236', flag: '🇨🇫' },
  { code: 'NE', name: 'Niger', dialCode: '+227', flag: '🇳🇪' },
  { code: 'MR', name: 'Mauritanie', dialCode: '+222', flag: '🇲🇷' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
  { code: 'US', name: 'États-Unis', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'Royaume-Uni', dialCode: '+44', flag: '🇬🇧' },
  { code: 'BE', name: 'Belgique', dialCode: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse', dialCode: '+41', flag: '🇨🇭' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
];

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  value: string;
  onChange: (value: string, countryCode: string) => void;
  countryCode?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, error, value, onChange, countryCode = 'CI', className = '', ...props }, ref) => {
    const initialCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];
    const [selectedCountry, setSelectedCountry] = useState<Country>(initialCountry);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Mettre à jour le pays sélectionné si le countryCode change
    useEffect(() => {
      const country = COUNTRIES.find(c => c.code === countryCode);
      if (country && country.code !== selectedCountry.code) {
        setSelectedCountry(country);
      }
    }, [countryCode, selectedCountry.code]);

    const handleCountrySelect = (country: Country) => {
      setSelectedCountry(country);
      setIsDropdownOpen(false);
      // Extraire le numéro actuel sans l'indicatif
      const currentNumber = value.replace(/^\+\d+\s*/, '');
      onChange(`${country.dialCode} ${currentNumber}`, country.code);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      // Si l'utilisateur tape un numéro complet avec indicatif, on le garde
      if (inputValue.startsWith('+')) {
        // Détecter le pays depuis l'indicatif
        const dialCodeMatch = inputValue.match(/^\+(\d+)/);
        if (dialCodeMatch) {
          const dialCode = `+${dialCodeMatch[1]}`;
          const country = COUNTRIES.find(c => c.dialCode === dialCode);
          if (country && country.code !== selectedCountry.code) {
            setSelectedCountry(country);
          }
        }
        onChange(inputValue, selectedCountry.code);
      } else {
        // Sinon, on ajoute l'indicatif du pays sélectionné
        const cleanValue = inputValue.replace(/\D/g, '');
        onChange(`${selectedCountry.dialCode} ${cleanValue}`, selectedCountry.code);
      }
    };

    // Extraire le numéro sans l'indicatif pour l'affichage
    const displayValue = (() => {
      if (!value) return '';
      if (value.startsWith('+')) {
        // Trouver le pays correspondant à l'indicatif dans le numéro
        const dialCodeMatch = value.match(/^\+(\d+)\s*/);
        if (dialCodeMatch) {
          const dialCode = `+${dialCodeMatch[1]}`;
          const country = COUNTRIES.find(c => c.dialCode === dialCode);
          if (country) {
            const numberPart = value.replace(dialCode, '').trim();
            // Formater le numéro avec des espaces tous les 2 chiffres
            const cleanNumber = numberPart.replace(/\s/g, '');
            return cleanNumber.replace(/(\d{2})(?=\d)/g, '$1 ');
          }
        }
        return value;
      }
      // Si la valeur ne commence pas par +, formater avec des espaces
      const cleanNumber = value.replace(/\s/g, '');
      return cleanNumber.replace(/(\d{2})(?=\d)/g, '$1 ');
    })();

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {/* Sélecteur de pays */}
          <div className="absolute left-0 top-0 bottom-0 flex items-center z-10">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-1 px-2 h-full border-r border-gray-300 bg-gray-50 rounded-l-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-xl">{selectedCountry.flag}</span>
              <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{selectedCountry.dialCode}</span>
              <IoChevronDown className="text-gray-500 flex-shrink-0" size={14} />
            </button>
          </div>

          {/* Dropdown des pays */}
          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto w-64">
                {COUNTRIES.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`w-full flex items-center space-x-3 px-4 py-2 hover:bg-gray-100 transition-colors ${
                      selectedCountry.code === country.code ? 'bg-primary-50' : ''
                    }`}
                  >
                    <span className="text-2xl">{country.flag}</span>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-gray-900">{country.name}</div>
                      <div className="text-xs text-gray-500">{country.dialCode}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Input du numéro */}
          <input
            ref={ref}
            type="tel"
            value={displayValue}
            onChange={handlePhoneChange}
            className={`input ${error ? 'border-primary-500 focus:ring-primary-500' : ''} ${className}`}
            placeholder="07 12 34 56 78"
            style={{ paddingLeft: '5.5rem', paddingRight: '1rem' }}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-sm text-primary-600 font-medium">{error}</p>}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

