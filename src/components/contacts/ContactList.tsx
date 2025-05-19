
import React, { useEffect, useState } from 'react';
import { useNostr } from '@/contexts/NostrContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CheckCheck, Plus, UserX, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface ContactListProps {
  pubkey?: string; // If provided, shows contacts for this pubkey, otherwise shows the current user's
  canFollow?: boolean; // Whether to show follow/unfollow buttons
}

const ContactList: React.FC<ContactListProps> = ({ 
  pubkey,
  canFollow = true
}) => {
  const { 
    fetchContacts, 
    followUser, 
    unfollowUser, 
    followingPubkeys, 
    isAuthenticated,
    fetchProfile
  } = useNostr();
  
  const [isLoading, setIsLoading] = useState(true);
  const [contacts, setContacts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadContacts = async () => {
      setIsLoading(true);
      const fetchedContacts = await fetchContacts(pubkey);
      setContacts(fetchedContacts);
      
      // Fetch profiles for all contacts
      const profilesMap: Record<string, any> = {};
      const profilePromises = fetchedContacts.map(async (contact) => {
        const profile = await fetchProfile(contact.pubkey);
        if (profile) {
          profilesMap[contact.pubkey] = profile;
        }
      });
      
      await Promise.all(profilePromises);
      setProfiles(profilesMap);
      setIsLoading(false);
    };
    
    loadContacts();
  }, [pubkey, fetchContacts, fetchProfile]);

  const handleFollow = async (contactPubkey: string) => {
    const success = await followUser(contactPubkey);
    if (success) {
      // Update local state to reflect the follow action
      if (!contacts.find(c => c.pubkey === contactPubkey)) {
        setContacts(prev => [...prev, { pubkey: contactPubkey }]);
      }
    }
  };

  const handleUnfollow = async (contactPubkey: string) => {
    const success = await unfollowUser(contactPubkey);
    if (success) {
      // Update local state to reflect the unfollow action
      setContacts(prev => prev.filter(c => c.pubkey !== contactPubkey));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <UserCheck className="h-12 w-12 mx-auto mb-2 opacity-20" />
        <p>No contacts yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contacts.map((contact) => {
        const profile = profiles[contact.pubkey];
        const isFollowing = followingPubkeys.includes(contact.pubkey);
        
        return (
          <div key={contact.pubkey} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
            <Link 
              to={`/profile/${contact.pubkey}`} 
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <Avatar className="h-10 w-10">
                {profile?.picture ? (
                  <AvatarImage src={profile.picture} alt={profile.displayName || profile.name || 'User'} />
                ) : (
                  <AvatarFallback>
                    {(profile?.displayName || profile?.name || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="truncate">
                <p className="font-medium">{profile?.displayName || profile?.name || 'Unknown user'}</p>
                <p className="text-xs text-muted-foreground truncate">{contact.pubkey.slice(0, 10)}...</p>
              </div>
            </Link>
            
            {isAuthenticated && canFollow && contact.pubkey !== pubkey && (
              <>
                {isFollowing ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleUnfollow(contact.pubkey)}
                    className="flex items-center gap-1"
                  >
                    <CheckCheck className="h-3 w-3" />
                    <span>Following</span>
                  </Button>
                ) : (
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => handleFollow(contact.pubkey)}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Follow</span>
                  </Button>
                )}
              </>
            )}
            
            {isAuthenticated && pubkey && contact.pubkey === pubkey && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleUnfollow(contact.pubkey)}
                className="flex items-center gap-1"
              >
                <UserX className="h-3 w-3" />
                <span>Unfollow</span>
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ContactList;
