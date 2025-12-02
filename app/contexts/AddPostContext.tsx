import React, { createContext, useState, useContext } from 'react';

interface AddPostContextType {
  modalVisible: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const AddPostContext = createContext<AddPostContextType>({
  modalVisible: false,
  openModal: () => {},
  closeModal: () => {},
});

export const useAddPost = () => useContext(AddPostContext);

export const AddPostProvider = ({ children }: { children: React.ReactNode }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const openModal = () => setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  return (
    <AddPostContext.Provider value={{ modalVisible, openModal, closeModal }}>
      {children}
    </AddPostContext.Provider>
  );
};
