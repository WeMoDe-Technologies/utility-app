import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { AntDesign } from '@expo/vector-icons';
import type { UtilityDefinition } from '@/types';

interface UtilityIconProps {
  utility: Pick<UtilityDefinition, 'icon' | 'iconFamily'>;
  size?: number;
  color?: string;
}

export function UtilityIcon({ utility, size = 24, color = '#fff' }: UtilityIconProps) {
  const { icon, iconFamily } = utility;

  switch (iconFamily) {
    case 'MaterialCommunityIcons':
      return <MaterialCommunityIcons name={icon as any} size={size} color={color} />;
    // case 'MaterialIcons':
    //   return <MaterialIcons name={icon as any} size={size} color={color} />;
    case 'Feather':
      return <Feather name={icon as any} size={size} color={color} />;
    case 'FontAwesome5':
      return <FontAwesome5 name={icon as any} size={size} color={color} />;
    case 'AntDesign':
      return <AntDesign name={icon as any} size={size} color={color} />;
    case 'Ionicons':
      return <Ionicons name={icon as any} size={size} color={color} />;
    default:
      return <MaterialIcons name={icon as any} size={size} color={color} />;
  }
}
